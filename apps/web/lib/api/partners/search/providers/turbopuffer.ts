import { chunk } from "@dub/utils";
import { Turbopuffer } from "@turbopuffer/turbopuffer";
import {
  getPartnerSearchableValues,
  normalizePartnerSearchQuery,
} from "../searchable-values";
import type { PartnerSearchDocument, PartnerSearchProvider } from "../types";
import { validatePartnerSearchCandidateLimit } from "../types";
import { withQueryDeadline, withTransientRetry } from "./resilience";
import { getEmailNgrams, getQueryNgrams, resolveIndexName } from "./shared";

const DEFAULT_NAMESPACE = "partner-search-v1";
const WRITE_BATCH_SIZE = 500;
const QUERY_OPERATION_TIMEOUT_MS = 1_000;

/**
 * One namespace holding every program, scoped per query by a `programId` filter.
 *
 * Turbopuffer's idiomatic multi-tenancy is a namespace per tenant, which would
 * make program isolation structural rather than filter-enforced. One shared
 * namespace is used instead because Turbopuffer's latency is cache-dependent:
 * traffic from every program keeps the single namespace warm, while per-program
 * namespaces would leave rarely-searched programs paying the cold-start cost on
 * most queries. The whole workload also fits one namespace comfortably (all
 * programs together are ~1.6M enrollment documents). A secondary benefit is
 * that provider methods can work with bare document IDs, which carry no program
 * to pick a namespace by.
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

/**
 * BM25 length normalization, left at turbopuffer's default.
 *
 * Lowering it is tempting: `searchText` is concatenated field values, so length
 * tracks how many links a partner has rather than how much prose they wrote,
 * and at 0.75 that demotes the most active partners. Searching "steven te" on
 * the production index ranks Steven Tey below a partner whose description
 * merely contains "tech", and the ordering flips at b=0.1.
 *
 * It was measured and rejected. On the same 100K index, b=0.1 against b=0.75
 * minutes apart: 16.05% vs 11.01% timeouts and 836ms vs 720ms p99 — flattening
 * the score distribution appears to defeat top-k pruning. The ranking gain only
 * applies to half-typed multi-word queries, since the all-terms branch already
 * handles complete ones.
 */
const SEARCH_TEXT_LENGTH_NORMALIZATION = 0.75;

// `searchText` and `emailNgrams` are BM25-indexed. BM25 attributes are not
// filterable by default, but `emailNgrams` needs to be: the n-gram branch uses
// a ContainsAllTokens filter to require every trigram.
const TURBOPUFFER_SCHEMA = {
  programId: { type: "string", filterable: true },
  searchText: {
    type: "string",
    full_text_search: {
      tokenizer: SEARCH_TEXT_TOKENIZER,
      b: SEARCH_TEXT_LENGTH_NORMALIZATION,
    },
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
    region: "aws-us-east-1",
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
 * Up to three ranked branches, rank-fused by the caller (see mergeBranchRows).
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

  // A multi-word query should prefer partners matching every word, and BM25
  // alone does not: term frequency saturates while length normalization keeps
  // biting, so a long document matching both words can rank below a short one
  // matching only the first. Measured on the production index, "steven tey" put
  // the actual Steven Tey third, behind two partners with no "tey" at all. This
  // branch admits only documents containing every term, so the rank fusion
  // lifts them over partial matches without excluding those partial matches.
  if (/\s/u.test(query)) {
    branches.push({
      rank_by: ["searchText", "BM25", query, { last_as_prefix: true }],
      filters: [
        "And",
        [
          programFilter,
          // Prefix on the last token here too. Without it the branch requires an
          // exact final token, so a half-typed "steven te" matches nothing and
          // search-as-you-type loses the boost exactly while it is being typed.
          // Prefix on the last token here too. Without it the branch requires an
          // exact final token, so a half-typed "steven te" matches nothing and
          // the boost disappears exactly while the user is still typing.
          ["searchText", "ContainsAllTokens", query, { last_as_prefix: true }],
        ],
      ],
    });
  }

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

// The standard reciprocal-rank-fusion constant: dampens the gap between
// neighboring ranks so one branch's top result cannot drown out the other's.
const RRF_RANK_CONSTANT = 60;

/**
 * Fuses the branches by rank (RRF) rather than by score. BM25 scores from
 * different clauses are not comparable — the n-gram branch sums over many
 * trigram terms and runs numerically hotter than the text branch — but rank
 * positions are. Each document scores Σ 1/(60 + rank) across the branches it
 * appears in, so a document found by both branches receives a contribution
 * from each, and the raw `$dist` values are deliberately unused. Relies on
 * each branch's rows arriving in the server's relevance order.
 */
function mergeBranchRows(
  branches: { rows?: { id: string | number; $dist?: number }[] }[],
  limit: number,
) {
  const scoreById = new Map<string, number>();

  for (const branch of branches) {
    (branch.rows ?? []).forEach((row, index) => {
      const id = String(row.id);
      const contribution = 1 / (RRF_RANK_CONSTANT + index + 1);
      scoreById.set(id, (scoreById.get(id) ?? 0) + contribution);
    });
  }

  return Array.from(scoreById, ([id, score]) => ({ id, score }))
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
  };
}
