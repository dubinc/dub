import { chunk } from "@dub/utils";
import { Search } from "@upstash/search";
import { normalizePartnerSearchQuery } from "../searchable-values";
import type {
  PartnerSearchCandidateQuery,
  PartnerSearchDocument,
  PartnerSearchProvider,
} from "../types";
import { validatePartnerSearchCandidateLimit } from "../types";
import { withQueryDeadline, withTransientRetry } from "./resilience";
import {
  getEmailNgrams,
  getQueryNgrams,
  logPartnerSearchDebug,
  resolveIndexName,
} from "./shared";

const DEFAULT_INDEX_NAME = "partner-search-v1";
const WRITE_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 1_000;
const WAIT_FOR_INDEXING_TIMEOUT_MS = 30_000;
const WAIT_FOR_INDEXING_POLL_MS = 100;
const QUERY_OPERATION_TIMEOUT_MS = 1_000;

interface UpstashSearchContent extends Record<string, unknown> {
  partnerId: string;
  name: string;
  email: string;
  companyName: string;
  description: string;
  platforms: string;
  links: string;
  emailNgrams: string;
}

interface UpstashSearchMetadata extends Record<string, unknown> {
  programId: string;
}

interface UpstashSearchResult {
  id: string;
  content: UpstashSearchContent;
  metadata?: UpstashSearchMetadata;
  score: number;
}

interface UpstashSearchIndexClient {
  search(params: {
    query: string;
    limit: number;
    filter: string;
    reranking: boolean;
    semanticWeight: number;
    inputEnrichment: boolean;
  }): Promise<UpstashSearchResult[]>;
  upsert(
    documents:
      | {
          id: string;
          content: UpstashSearchContent;
          metadata: UpstashSearchMetadata;
        }
      | {
          id: string;
          content: UpstashSearchContent;
          metadata: UpstashSearchMetadata;
        }[],
  ): Promise<string>;
  delete(documentIds: string[]): Promise<{ deleted: number }>;
  range(params: {
    cursor: string;
    limit: number;
  }): Promise<{ nextCursor: string; documents: { id: string }[] }>;
  info(): Promise<{ pendingDocumentCount: number; documentCount: number }>;
  deleteIndex(): Promise<string>;
}

interface CreateUpstashSearchPartnerSearchProviderOptions {
  searchIndex?: UpstashSearchIndexClient;
  indexName?: string;
}

function getIndexName(indexName?: string): string {
  return resolveIndexName(
    [
      indexName,
      process.env.PARTNER_UPSTASH_SEARCH_INDEX_NAME,
      process.env.PARTNER_SEARCH_INDEX_NAME,
    ],
    DEFAULT_INDEX_NAME,
  );
}

function createSearchIndex(indexName: string): UpstashSearchIndexClient {
  const url = process.env.UPSTASH_SEARCH_REST_URL;
  const token = process.env.UPSTASH_SEARCH_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_SEARCH_REST_URL and UPSTASH_SEARCH_REST_TOKEN are required for partner search.",
    );
  }

  const client = new Search({ url, token, retry: false });
  return client.index<UpstashSearchContent, UpstashSearchMetadata>(indexName);
}

function truncate(value: string | null, maxLength: number): string {
  return value?.slice(0, maxLength) ?? "";
}

function joinValues(values: string[], maxLength: number): string {
  return truncate(values.join(" "), maxLength);
}

function serializeUpstashSearchDocument(document: PartnerSearchDocument) {
  // Upstash Search limits searchable content to 4,096 characters. Give each
  // assignment field its own budget so a long description cannot crowd out
  // platforms, links, or the email n-grams used for partial email matching.
  const content: UpstashSearchContent = {
    partnerId: truncate(document.partnerId, 50),
    name: truncate(document.name, 200),
    email: truncate(normalizePartnerSearchQuery(document.email ?? ""), 320),
    companyName: truncate(document.companyName, 200),
    description: truncate(document.description, 700),
    platforms: joinValues(
      [...document.platformTypes, ...document.platformIdentifiers],
      500,
    ),
    links: joinValues(
      [
        ...document.linkDomains,
        ...document.linkKeys,
        ...document.shortLinks,
        ...document.destinationUrls,
      ],
      850,
    ),
    emailNgrams: truncate(getEmailNgrams(document.email), 800),
  };

  // Program scope is the only metadata Search needs. The database applies
  // status, group, tag, country, metric, and sorting constraints after it
  // receives the relevance-ranked enrollment IDs.
  const metadata: UpstashSearchMetadata = { programId: document.programId };

  return { id: document.id, content, metadata };
}

function quoteFilterValue(value: string): string {
  return JSON.stringify(value);
}

function buildUpstashSearchFilter(programId: string): string {
  return `@metadata.programId = ${quoteFilterValue(programId)}`;
}

function mergeSearchResults(
  standardResults: UpstashSearchResult[],
  emailResults: UpstashSearchResult[],
): UpstashSearchResult[] {
  const resultsById = new Map<string, UpstashSearchResult>();

  for (const result of [...standardResults, ...emailResults]) {
    const existing = resultsById.get(result.id);
    if (!existing || result.score > existing.score) {
      resultsById.set(result.id, result);
    }
  }

  return Array.from(resultsById.values()).sort(
    (left, right) =>
      right.score - left.score || left.id.localeCompare(right.id),
  );
}

export async function deleteUpstashSearchPartnerSearchIndex({
  searchIndex,
  indexName,
}: CreateUpstashSearchPartnerSearchProviderOptions = {}) {
  const resolvedIndexName = getIndexName(indexName);
  const index = searchIndex ?? createSearchIndex(resolvedIndexName);
  const { documentCount } = await withTransientRetry(() => index.info());

  // Delete the logical index instead of resetting its documents. The next
  // backfill recreates the index automatically when it writes the first
  // document.
  await withTransientRetry(() => index.deleteIndex());

  return { indexName: resolvedIndexName, documentCount };
}

export function createUpstashSearchPartnerSearchProvider({
  searchIndex,
  indexName,
}: CreateUpstashSearchPartnerSearchProviderOptions = {}): PartnerSearchProvider {
  const resolvedIndexName = getIndexName(indexName);
  const index = searchIndex ?? createSearchIndex(resolvedIndexName);

  async function findSearchCandidates({
    programId,
    query,
    limit,
  }: PartnerSearchCandidateQuery): Promise<UpstashSearchResult[]> {
    const normalizedQuery = normalizePartnerSearchQuery(query);
    const filter = buildUpstashSearchFilter(programId);
    const searchParams = {
      limit,
      filter,
      reranking: false,
      // This table needs literal full-text matching rather than related results
      // that happen to be semantically similar to a name, email, or URL.
      semanticWeight: 0,
      inputEnrichment: false,
    };
    const queryNgrams = getQueryNgrams(normalizedQuery);

    const [standardResults, rawEmailResults] = await withQueryDeadline(
      () =>
        Promise.all([
          index.search({ ...searchParams, query: normalizedQuery }),
          // Upstash Search takes the n-grams as one query string, unlike Redis
          // Search which needs each as a separate condition.
          queryNgrams.length > 0
            ? index.search({ ...searchParams, query: queryNgrams.join(" ") })
            : Promise.resolve([]),
        ]),
      QUERY_OPERATION_TIMEOUT_MS,
    );

    const emailResults = rawEmailResults.filter(({ content }) =>
      content.email.includes(normalizedQuery),
    );
    return mergeSearchResults(standardResults, emailResults);
  }

  return {
    async searchCandidates({ programId, query, limit }) {
      validatePartnerSearchCandidateLimit(limit);
      const candidates = await findSearchCandidates({
        programId,
        query,
        limit,
      });
      const hits = candidates.slice(0, limit).map(({ id, score }) => ({
        id,
        score,
      }));

      logPartnerSearchDebug("Upstash Search", {
        indexName: resolvedIndexName,
        operation: "searchCandidates",
        query: { programId, query, limit },
        resultCount: hits.length,
        hits,
      });

      return { hits };
    },

    async waitForIndexing() {
      const deadline = Date.now() + WAIT_FOR_INDEXING_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const { pendingDocumentCount } = await withTransientRetry(() =>
          index.info(),
        );
        if (pendingDocumentCount === 0) {
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, WAIT_FOR_INDEXING_POLL_MS),
        );
      }

      throw new Error(
        `Partner search waitForIndexing timed out after ${WAIT_FOR_INDEXING_TIMEOUT_MS}ms.`,
      );
    },

    async upsert(documents) {
      for (const documentBatch of chunk(documents, WRITE_BATCH_SIZE)) {
        await withTransientRetry(() =>
          index.upsert(documentBatch.map(serializeUpstashSearchDocument)),
        );
      }
    },

    async delete(documentIds) {
      for (const documentIdBatch of chunk(documentIds, DELETE_BATCH_SIZE)) {
        await withTransientRetry(() => index.delete(documentIdBatch));
      }
    },

    async listDocumentIds({ cursor, limit }) {
      const { nextCursor, documents } = await withTransientRetry(() =>
        index.range({ cursor: cursor ?? "0", limit }),
      );

      // An empty nextCursor means the range is exhausted. The SDK types it as a
      // plain string, so the sentinel is not visible from the signature.
      return {
        documentIds: documents.map(({ id }) => id),
        cursor: nextCursor === "" ? null : nextCursor,
      };
    },
  };
}
