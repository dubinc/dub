import { chunk } from "@dub/utils";
import { Search } from "@upstash/search";
import {
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  validatePartnerSearchCandidateLimit,
} from "../constants";
import { normalizePartnerSearchQuery } from "../searchable-values";
import type {
  PartnerSearchCountQuery,
  PartnerSearchDocument,
  PartnerSearchGroup,
  PartnerSearchGroupField,
  PartnerSearchListFilter,
  PartnerSearchProvider,
  PartnerSearchQuery,
} from "../types";

const DEFAULT_INDEX_NAME = "partner-search-v1";
const NULL_VALUE = "\0__null:f47ac10b-58cc-4372-a567-0e02b2c3d479__";
const MAX_SEARCH_RESULTS = PARTNER_SEARCH_CANDIDATE_LIMIT;
const WRITE_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 1_000;
const WAIT_FOR_INDEXING_TIMEOUT_MS = 30_000;
const WAIT_FOR_INDEXING_POLL_MS = 100;
const CANDIDATE_CACHE_TTL_MS = 1_000;
const MAX_CANDIDATE_CACHE_ENTRIES = 100;
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
  partnerId: string;
  status: string;
  tenantId: string;
  groupId: string;
  country: string;
  partnerTagIds: string[];
  referredByPartnerId: string;
  totalClicks: number;
  totalLeads: number;
  totalConversions: number;
  totalSaleAmount: number;
  totalCommissions: number;
  netRevenue: number;
  earningsPerClick: number;
  averageLifetimeValue?: number;
  clickToLeadRate?: number;
  clickToConversionRate?: number;
  leadToConversionRate?: number;
  returnOnAdSpend?: number;
  createdAt: number;
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

interface CandidateCacheEntry {
  expiresAt: number;
  promise: Promise<UpstashSearchResult[]>;
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

  const metadata: UpstashSearchMetadata = {
    programId: document.programId,
    partnerId: document.partnerId,
    status: document.status,
    tenantId: document.tenantId ?? NULL_VALUE,
    groupId: document.groupId ?? NULL_VALUE,
    country: document.country ?? NULL_VALUE,
    partnerTagIds: document.partnerTagIds,
    referredByPartnerId: document.referredByPartnerId ?? NULL_VALUE,
    totalClicks: document.totalClicks,
    totalLeads: document.totalLeads,
    totalConversions: document.totalConversions,
    totalSaleAmount: document.totalSaleAmount,
    totalCommissions: document.totalCommissions,
    netRevenue: document.netRevenue,
    earningsPerClick: document.earningsPerClick,
    ...(document.averageLifetimeValue !== null && {
      averageLifetimeValue: document.averageLifetimeValue,
    }),
    ...(document.clickToLeadRate !== null && {
      clickToLeadRate: document.clickToLeadRate,
    }),
    ...(document.clickToConversionRate !== null && {
      clickToConversionRate: document.clickToConversionRate,
    }),
    ...(document.leadToConversionRate !== null && {
      leadToConversionRate: document.leadToConversionRate,
    }),
    ...(document.returnOnAdSpend !== null && {
      returnOnAdSpend: document.returnOnAdSpend,
    }),
    createdAt: new Date(document.createdAt).getTime(),
  };

  return { id: document.id, content, metadata };
}

function quoteFilterValue(value: string): string {
  return JSON.stringify(value);
}

function buildScalarListFilter(
  field: string,
  filter: PartnerSearchListFilter,
): string {
  const values = filter.values.map(quoteFilterValue).join(", ");
  return `@metadata.${field} ${filter.operator === "IN" ? "IN" : "NOT IN"} (${values})`;
}

function buildArrayListFilter(
  field: string,
  filter: PartnerSearchListFilter,
): string {
  const operator = filter.operator === "IN" ? "CONTAINS" : "NOT CONTAINS";
  const booleanOperator = filter.operator === "IN" ? " OR " : " AND ";
  return `(${filter.values
    .map((value) => `@metadata.${field} ${operator} ${quoteFilterValue(value)}`)
    .join(booleanOperator)})`;
}

function buildUpstashSearchFilter({
  programId,
  filters,
}: PartnerSearchCountQuery): string {
  const conditions = [`@metadata.programId = ${quoteFilterValue(programId)}`];

  if (filters?.status) {
    conditions.push(`@metadata.status = ${quoteFilterValue(filters.status)}`);
  }
  if (filters?.tenantId) {
    conditions.push(
      `@metadata.tenantId = ${quoteFilterValue(filters.tenantId)}`,
    );
  }
  if (filters?.partnerIds?.length) {
    conditions.push(
      buildScalarListFilter("partnerId", {
        values: filters.partnerIds,
        operator: "IN",
      }),
    );
  }

  const listFilters: [
    "groupId" | "country",
    PartnerSearchListFilter | undefined,
  ][] = [
    ["groupId", filters?.groupIds],
    ["country", filters?.countries],
  ];

  for (const [field, listFilter] of listFilters) {
    if (listFilter?.values.length) {
      conditions.push(buildScalarListFilter(field, listFilter));
    }
  }

  if (filters?.partnerTagIds?.values.length) {
    conditions.push(
      buildArrayListFilter("partnerTagIds", filters.partnerTagIds),
    );
  }
  if (filters?.referredByPartnerId) {
    conditions.push(
      `@metadata.referredByPartnerId = ${quoteFilterValue(filters.referredByPartnerId)}`,
    );
  }

  for (const [field, range] of Object.entries(filters?.metrics ?? {})) {
    if (range.min !== undefined) {
      conditions.push(`@metadata.${field} >= ${range.min}`);
    }
    if (range.max !== undefined) {
      conditions.push(`@metadata.${field} <= ${range.max}`);
    }
  }

  return conditions.join(" AND ");
}

function assertCompleteResults(results: UpstashSearchResult[], query: string) {
  // Upstash Search has no count, aggregation, offset, or search cursor API.
  // We can preserve the provider contract only while the complete match set
  // fits below its top-1,000 response limit. Reject capped results so the UI
  // never presents an incomplete count, facet, sorted page, or later page.
  if (results.length >= MAX_SEARCH_RESULTS) {
    throw new Error(
      `Upstash Search returned its ${MAX_SEARCH_RESULTS.toLocaleString()}-result limit for query ${JSON.stringify(query)}. Exact pagination, counts, and facets are unavailable for this query.`,
    );
  }
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

function compareResults(
  left: UpstashSearchResult,
  right: UpstashSearchResult,
  sort: NonNullable<PartnerSearchQuery["sort"]>,
): number {
  const leftValue = left.metadata?.[sort.field] as number | undefined;
  const rightValue = right.metadata?.[sort.field] as number | undefined;

  if (leftValue === rightValue) {
    return left.id.localeCompare(right.id);
  }
  if (leftValue === undefined) {
    return 1;
  }
  if (rightValue === undefined) {
    return -1;
  }

  const comparison = leftValue < rightValue ? -1 : 1;
  return sort.order === "asc" ? comparison : -comparison;
}

function getGroupValues(
  result: UpstashSearchResult,
  field: PartnerSearchGroupField,
): string[] {
  const metadata = result.metadata;
  if (!metadata) {
    return [];
  }
  if (field === "partnerTagId") {
    return metadata.partnerTagIds;
  }

  const value = metadata[field];
  if (typeof value !== "string") {
    return [];
  }
  if (field === "referredByPartnerId" && value === NULL_VALUE) {
    return [];
  }
  return [value];
}

function mapGroupValue(value: string): string | null {
  return value === NULL_VALUE ? null : value;
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
  const candidateCache = new Map<string, CandidateCacheEntry>();

  async function findSearchCandidates(
    query: PartnerSearchCountQuery,
    { limit, requireComplete }: { limit: number; requireComplete: boolean },
  ): Promise<UpstashSearchResult[]> {
    const normalizedQuery = normalizePartnerSearchQuery(query.query);
    const filter = buildUpstashSearchFilter(query);
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

    if (requireComplete) {
      assertCompleteResults(standardResults, normalizedQuery);
      assertCompleteResults(rawEmailResults, normalizedQuery);
    }

    const emailResults = rawEmailResults.filter(({ content }) =>
      content.email.includes(normalizedQuery),
    );
    return mergeSearchResults(standardResults, emailResults);
  }

  function getCandidates(
    query: PartnerSearchCountQuery,
  ): Promise<UpstashSearchResult[]> {
    const now = Date.now();
    const cacheKey = JSON.stringify({
      programId: query.programId,
      query: query.query,
      filters: query.filters,
    });
    const cached = candidateCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.promise;
    }

    if (candidateCache.size >= MAX_CANDIDATE_CACHE_ENTRIES) {
      candidateCache.delete(candidateCache.keys().next().value!);
    }

    const promise = findSearchCandidates(query, {
      limit: MAX_SEARCH_RESULTS,
      requireComplete: true,
    }).catch((error) => {
      candidateCache.delete(cacheKey);
      throw error;
    });
    candidateCache.set(cacheKey, {
      expiresAt: now + CANDIDATE_CACHE_TTL_MS,
      promise,
    });
    return promise;
  }

  return {
    mode: "relevance-only",

    async searchCandidates({ programId, query, limit }) {
      validatePartnerSearchCandidateLimit(limit);
      const candidates = await findSearchCandidates(
        { programId, query },
        { limit, requireComplete: false },
      );
      const hits = candidates
        .slice(0, limit)
        .flatMap(({ id, metadata, score }) =>
          metadata ? [{ id, partnerId: metadata.partnerId, score }] : [],
        );

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
      const { sort } = query;
      if (sort) {
        const candidates = [...(await getCandidates(query))];
        candidates.sort((left, right) => compareResults(left, right, sort));

        const offset = (query.page - 1) * query.pageSize;
        const hits = candidates
          .slice(offset, offset + query.pageSize)
          .flatMap(({ id, metadata, score }) =>
            metadata ? [{ id, partnerId: metadata.partnerId, score }] : [],
          );

        logPartnerSearchDebug("search", {
          indexName: resolvedIndexName,
          query,
          candidateCount: candidates.length,
          resultCount: hits.length,
          hits,
        });

        return { hits };
      }

      const requestedResults = query.page * query.pageSize;
      if (requestedResults > MAX_SEARCH_RESULTS) {
        throw new Error(
          `Upstash Search relevance pagination is limited to the first ${MAX_SEARCH_RESULTS.toLocaleString()} results.`,
        );
      }

      // Upstash Search natively returns relevance-ranked results. Fetch enough
      // results to derive the requested page without requiring a complete set.
      const candidates = await findSearchCandidates(query, {
        limit: requestedResults,
        requireComplete: false,
      });
      const offset = (query.page - 1) * query.pageSize;
      const hits = candidates
        .slice(offset, offset + query.pageSize)
        .flatMap(({ id, metadata, score }) =>
          metadata ? [{ id, partnerId: metadata.partnerId, score }] : [],
        );

      logPartnerSearchDebug("search", {
        indexName: resolvedIndexName,
        query,
        candidateCount: candidates.length,
        resultCount: hits.length,
        hits,
      });

      return { hits };
    },

    async count(query) {
      const count = (await getCandidates(query)).length;
      logPartnerSearchDebug("count", {
        indexName: resolvedIndexName,
        query,
        count,
      });
      return count;
    },

    async groupBy(query, field): Promise<PartnerSearchGroup[]> {
      const groups = new Map<string, number>();
      for (const candidate of await getCandidates(query)) {
        for (const value of getGroupValues(candidate, field)) {
          groups.set(value, (groups.get(value) ?? 0) + 1);
        }
      }

      const result = Array.from(groups, ([value, count]) => ({
        value: mapGroupValue(value),
        count,
      }));
      logPartnerSearchDebug("groupBy", {
        indexName: resolvedIndexName,
        query,
        field,
        groupCount: result.length,
        groups: result,
      });
      return result;
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
      candidateCache.clear();
    },

    async delete(documentIds) {
      for (const documentIdBatch of chunk(documentIds, DELETE_BATCH_SIZE)) {
        await withTransientRetry(() => index.delete(documentIdBatch));
      }
      candidateCache.clear();
    },
  };
}
