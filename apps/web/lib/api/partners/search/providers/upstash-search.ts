import { chunk } from "@dub/utils";
import { Search } from "@upstash/search";
import {
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  validatePartnerSearchCandidateLimit,
} from "../constants";
import { normalizePartnerSearchQuery } from "../searchable-values";
import type {
  PartnerSearchCandidateQuery,
  PartnerSearchDocument,
  PartnerSearchProvider,
} from "../types";

const DEFAULT_INDEX_NAME = "partner-search-v1";
const MAX_SEARCH_RESULTS = PARTNER_SEARCH_CANDIDATE_LIMIT;
const WRITE_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 1_000;
const WAIT_FOR_INDEXING_TIMEOUT_MS = 30_000;
const WAIT_FOR_INDEXING_POLL_MS = 100;
const TRANSIENT_RETRY_ATTEMPTS = 2;
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
  info(): Promise<{ pendingDocumentCount: number; documentCount: number }>;
}

interface CreateUpstashSearchPartnerSearchProviderOptions {
  searchIndex?: UpstashSearchIndexClient;
  indexName?: string;
}

function getIndexName(indexName?: string): string {
  return (
    indexName ??
    process.env.PARTNER_UPSTASH_SEARCH_INDEX_NAME?.trim() ??
    process.env.PARTNER_SEARCH_INDEX_NAME?.trim() ??
    DEFAULT_INDEX_NAME
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

function getEmailNgrams(email: string | null): string {
  if (!email) {
    return "";
  }

  const normalized = normalizePartnerSearchQuery(email);
  if (normalized.length < 3) {
    return normalized;
  }

  return Array.from(
    new Set(
      Array.from({ length: normalized.length - 2 }, (_, index) =>
        normalized.slice(index, index + 3),
      ),
    ),
  ).join(" ");
}

function getQueryNgrams(query: string): string | null {
  if (query.length < 3 || /\s/u.test(query)) {
    return null;
  }

  return Array.from(
    new Set(
      Array.from({ length: query.length - 2 }, (_, index) =>
        query.slice(index, index + 3),
      ),
    ),
  ).join(" ");
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

function isTransientError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|rate.?limit|timeout|timed out|fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(
    message,
  );
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|ETIMEDOUT/i.test(message);
}

async function withTransientRetry<T>(
  operation: () => Promise<T>,
  { retryTimeouts = true }: { retryTimeouts?: boolean } = {},
): Promise<T> {
  for (let attempt = 1; attempt <= TRANSIENT_RETRY_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt === TRANSIENT_RETRY_ATTEMPTS ||
        !isTransientError(error) ||
        (!retryTimeouts && isTimeoutError(error))
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 50 * attempt + Math.random() * 25),
      );
    }
  }

  throw new Error("Partner search operation failed.");
}

async function withQueryDeadline<T>(operation: () => Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error(
            `Partner search query timed out after ${QUERY_OPERATION_TIMEOUT_MS}ms.`,
          ),
        ),
      QUERY_OPERATION_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([
      withTransientRetry(operation, { retryTimeouts: false }),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
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

function logPartnerSearchDebug(
  operation: "search" | "count" | "groupBy",
  details: Record<string, unknown>,
) {
  if (process.env.PARTNER_SEARCH_DEBUG !== "true") {
    return;
  }

  console.log(`[Partner Search Debug] Upstash Search ${operation}`, details);
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

    const [standardResults, rawEmailResults] = await withQueryDeadline(() =>
      Promise.all([
        index.search({ ...searchParams, query: normalizedQuery }),
        queryNgrams
          ? index.search({ ...searchParams, query: queryNgrams })
          : Promise.resolve([]),
      ]),
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

      logPartnerSearchDebug("search", {
        indexName: resolvedIndexName,
        operation: "searchCandidates",
        query: { programId, query, limit },
        resultCount: hits.length,
        hits,
      });

      return { hits };
    },

    async search(query) {
      if (query.sort) {
        throw new Error(
          "Upstash Search partner search supports relevance ordering only.",
        );
      }
      if (query.filters && Object.keys(query.filters).length > 0) {
        throw new Error(
          "Upstash Search partner search filters must be applied by the database.",
        );
      }

      const offset = (query.page - 1) * query.pageSize;
      const requestedResults = offset + query.pageSize;
      if (requestedResults > MAX_SEARCH_RESULTS) {
        throw new Error(
          `Upstash Search relevance pagination is limited to the first ${MAX_SEARCH_RESULTS.toLocaleString()} results.`,
        );
      }

      const candidates = await findSearchCandidates({
        programId: query.programId,
        query: query.query,
        limit: requestedResults,
      });
      const hits = candidates
        .slice(offset, offset + query.pageSize)
        .map(({ id, score }) => ({ id, score }));

      logPartnerSearchDebug("search", {
        indexName: resolvedIndexName,
        query,
        candidateCount: candidates.length,
        resultCount: hits.length,
        hits,
      });

      return { hits };
    },

    async count() {
      throw new Error(
        "Upstash Search partner search counts must be calculated by the database.",
      );
    },

    async groupBy() {
      throw new Error(
        "Upstash Search partner search groups must be calculated by the database.",
      );
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
  };
}
