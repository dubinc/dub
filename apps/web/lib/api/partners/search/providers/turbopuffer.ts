import { chunk } from "@dub/utils";
import { Turbopuffer } from "@turbopuffer/turbopuffer";
import {
  getPartnerSearchableValues,
  normalizePartnerSearchQuery,
} from "../searchable-values";
import type { PartnerSearchDocument, PartnerSearchProvider } from "../types";
import { validatePartnerSearchCandidateLimit } from "../types";
import { withQueryDeadline, withTransientRetry } from "./resilience";
import {
  getEmailNgrams,
  getQueryNgrams,
  logPartnerSearchDebug,
  resolveIndexName,
} from "./shared";

const DEFAULT_NAMESPACE = "partner-search-v1";
const DEFAULT_REGION = "aws-us-east-1";
const WRITE_BATCH_SIZE = 500;
const QUERY_OPERATION_TIMEOUT_MS = 1_000;

/**
 * One namespace holding every program, scoped per query by a `programId` filter.
 *
 * Turbopuffer's idiomatic multi-tenancy is a namespace per tenant, which would
 * make program isolation structural rather than filter-enforced. It is not used
 * here because `PartnerSearchProvider.delete` receives only document IDs — with
 * no program in hand there is no way to pick the namespace to delete from.
 * Switching would mean widening the interface to carry the program.
 */
interface TurbopufferPartnerSearchRow extends Record<string, unknown> {
  id: string;
  programId: string;
  searchText: string;
  emailNgrams: string;
}

/**
 * Pinned rather than left to default. Turbopuffer's newer tokenizers keep a URL
 * as a single token, so `scottdigital` cannot match
 * `https://www.scottdigital-42.techcorp.io` — and partner websites, short
 * links, and destination URLs are all searchable fields here. word_v2 splits
 * URLs into their components while handling emails, handles, and hyphenated
 * keys the same way the newer ones do.
 *
 * Changing this requires a full re-backfill: it changes how documents are
 * tokenized at write time, so existing rows keep their old indexing.
 */
const SEARCH_TEXT_TOKENIZER = "word_v2";

// `searchText` and `emailNgrams` are BM25-indexed. BM25 attributes are not
// filterable by default, but `emailNgrams` needs to be: the n-gram branch uses
// a ContainsAllTokens filter to require every trigram.
const TURBOPUFFER_SCHEMA = {
  programId: { type: "string", filterable: true },
  searchText: {
    type: "string",
    full_text_search: { tokenizer: SEARCH_TEXT_TOKENIZER },
  },
  emailNgrams: {
    type: "string",
    full_text_search: { tokenizer: SEARCH_TEXT_TOKENIZER },
    filterable: true,
  },
} as const;

interface CreateTurbopufferPartnerSearchProviderOptions {
  namespace?: TurbopufferNamespace;
  namespaceName?: string;
}

/** The subset of the SDK namespace this provider uses, so tests can fake it. */
export interface TurbopufferNamespace {
  write(params: Record<string, unknown>): Promise<{ rows_affected: number }>;
  query(params: Record<string, unknown>): Promise<{
    rows?: { id: string | number; $dist?: number }[];
  }>;
  multiQuery(params: Record<string, unknown>): Promise<{
    results?: { rows?: { id: string | number; $dist?: number }[] }[];
  }>;
  deleteAll(): Promise<unknown>;
}

function getNamespaceName(namespaceName?: string): string {
  return resolveIndexName(
    [namespaceName, process.env.PARTNER_SEARCH_INDEX_NAME],
    DEFAULT_NAMESPACE,
  );
}

function createNamespace(namespaceName: string): TurbopufferNamespace {
  const apiKey = process.env.TURBOPUFFER_API_KEY;

  if (!apiKey) {
    throw new Error("TURBOPUFFER_API_KEY is required for partner search.");
  }

  const client = new Turbopuffer({
    apiKey,
    region: process.env.TURBOPUFFER_REGION?.trim() || DEFAULT_REGION,
  });

  return client.namespace(namespaceName) as unknown as TurbopufferNamespace;
}

function serializeTurbopufferRow(
  document: PartnerSearchDocument,
): TurbopufferPartnerSearchRow {
  return {
    id: document.id,
    programId: document.programId,
    searchText: getPartnerSearchableValues(document)
      .map(normalizePartnerSearchQuery)
      .join(" "),
    emailNgrams: getEmailNgrams(document.email),
  };
}

/**
 * Two ranked branches, unioned by the caller.
 *
 * The text branch treats the last token as a prefix so "john" reaches
 * "johnson", matching how the Redis provider's $smart behaves. The n-gram
 * branch carries a ContainsAllTokens filter so every trigram must be present —
 * BM25 alone would score a document that shares just one, which is how an
 * unrelated address ends up looking like a partial-email match.
 */
function buildQueryBranches(programId: string, query: string) {
  const programFilter = ["programId", "Eq", programId];
  const branches: Record<string, unknown>[] = [
    {
      rank_by: ["searchText", "BM25", query, { last_as_prefix: true }],
      filters: programFilter,
    },
  ];

  const ngrams = getQueryNgrams(query).join(" ");
  if (ngrams) {
    branches.push({
      rank_by: ["emailNgrams", "BM25", ngrams],
      filters: [
        "And",
        [programFilter, ["emailNgrams", "ContainsAllTokens", ngrams]],
      ],
    });
  }

  return branches;
}

function mergeBranchRows(
  branches: { rows?: { id: string | number; $dist?: number }[] }[],
  limit: number,
) {
  const bestById = new Map<string, number>();

  for (const branch of branches) {
    for (const row of branch.rows ?? []) {
      const id = String(row.id);
      const score = row.$dist ?? 0;
      // Scores come from different BM25 clauses and are not directly
      // comparable; the higher one only decides ordering within the union.
      if (!bestById.has(id) || score > bestById.get(id)!) {
        bestById.set(id, score);
      }
    }
  }

  return Array.from(bestById, ([id, score]) => ({ id, score }))
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    )
    .slice(0, limit);
}

export async function deleteTurbopufferPartnerSearchNamespace({
  namespace,
  namespaceName,
}: CreateTurbopufferPartnerSearchProviderOptions = {}) {
  const resolvedNamespaceName = getNamespaceName(namespaceName);
  const resolvedNamespace = namespace ?? createNamespace(resolvedNamespaceName);

  await withTransientRetry(() => resolvedNamespace.deleteAll());

  return { namespaceName: resolvedNamespaceName };
}

export function createTurbopufferPartnerSearchProvider({
  namespace,
  namespaceName,
}: CreateTurbopufferPartnerSearchProviderOptions = {}): PartnerSearchProvider {
  const resolvedNamespaceName = getNamespaceName(namespaceName);
  const resolvedNamespace = namespace ?? createNamespace(resolvedNamespaceName);

  return {
    async searchCandidates({ programId, query, limit }) {
      validatePartnerSearchCandidateLimit(limit);

      const normalizedQuery = normalizePartnerSearchQuery(query);
      const branches = buildQueryBranches(programId, normalizedQuery).map(
        (branch) => ({ ...branch, top_k: limit, include_attributes: false }),
      );

      // One round trip regardless of branch count.
      const { results } = await withQueryDeadline(
        () => resolvedNamespace.multiQuery({ queries: branches }),
        QUERY_OPERATION_TIMEOUT_MS,
      );

      const hits = mergeBranchRows(results ?? [], limit);

      logPartnerSearchDebug("Turbopuffer", {
        namespace: resolvedNamespaceName,
        operation: "searchCandidates",
        query: { programId, query, limit },
        branches: branches.length,
        resultCount: hits.length,
        hits,
      });

      return { hits };
    },

    async waitForIndexing() {
      // Turbopuffer writes are read-after-write consistent — a committed write
      // is immediately queryable, so there is no indexing lag to wait on.
    },

    async upsert(documents) {
      for (const documentBatch of chunk(documents, WRITE_BATCH_SIZE)) {
        await withTransientRetry(() =>
          resolvedNamespace.write({
            upsert_rows: documentBatch.map(serializeTurbopufferRow),
            schema: TURBOPUFFER_SCHEMA,
          }),
        );
      }
    },

    async delete(documentIds) {
      for (const documentIdBatch of chunk(documentIds, WRITE_BATCH_SIZE)) {
        await withTransientRetry(() =>
          resolvedNamespace.write({ deletes: documentIdBatch }),
        );
      }
    },

    async listDocumentIds({ cursor, limit }) {
      // Keyset pagination over the ID order, the same shape the backfill uses
      // against the database. Turbopuffer has no scan cursor of its own.
      const { rows } = await withTransientRetry(() =>
        resolvedNamespace.query({
          rank_by: ["id", "asc"],
          top_k: limit,
          include_attributes: false,
          ...(cursor ? { filters: ["id", "Gt", cursor] } : {}),
        }),
      );

      const documentIds = (rows ?? []).map(({ id }) => String(id));

      return {
        documentIds,
        // A short page means the namespace is exhausted; otherwise resume from
        // the last ID.
        cursor:
          documentIds.length < limit
            ? null
            : documentIds[documentIds.length - 1],
      };
    },
  };
}
