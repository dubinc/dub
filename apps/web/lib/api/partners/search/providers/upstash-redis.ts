import { chunk } from "@dub/utils";
import {
  Redis,
  s,
  type InferFilterFromSchema,
  type SearchIndex,
} from "@upstash/redis";
import {
  getPartnerSearchableValues,
  normalizePartnerSearchQuery,
} from "../searchable-values";
import type {
  PartnerSearchCountQuery,
  PartnerSearchDocument,
  PartnerSearchGroup,
  PartnerSearchGroupField,
  PartnerSearchListFilter,
  PartnerSearchMetricField,
  PartnerSearchProvider,
  PartnerSearchQuery,
} from "../types";

const DEFAULT_INDEX_NAME = "partner-search-v1";
// Sentinel value for nullable keyword fields. Redis Search keyword fields
// cannot store null, so we use a value that will never appear in real data
// to represent absent values and map it back to null in query results.
const NULL_VALUE = "\0__null:f47ac10b-58cc-4372-a567-0e02b2c3d479__";
const MAX_GROUPS = 1_000;
const TRANSIENT_RETRY_ATTEMPTS = 2;
// Keep the full query operation within the one-second latency target while
// leaving a small window to retry failures that return quickly
const QUERY_REQUEST_TIMEOUT_MS = 900;
const QUERY_OPERATION_TIMEOUT_MS = 1_000;
const WRITE_REQUEST_TIMEOUT_MS = 10_000;
const WRITE_BATCH_SIZE = 100;
const WAIT_FOR_INDEXING_TIMEOUT_MS = 30_000;
const DOCUMENT_TYPE_PARTNER = "partner";
const DOCUMENT_TYPE_TAG = "tag";

// Redis Search keyword fields accept one string value rather than an array of tag IDs
// The partner document stores tag IDs as searchable text for filtering,
// but Redis Search cannot use that text to group and count individual tags
// To support tag grouping, we add one shadow document per tag with a scalar
// partnerTagId that the provider can aggregate with $terms
export const upstashPartnerSearchSchema = s.object({
  id: s.keyword(),
  programId: s.keyword(),
  partnerId: s.keyword(),
  documentType: s.keyword(),
  searchText: s.string().noStem(),
  emailNgrams: s.string().noStem(),
  status: s.keyword(),
  tenantId: s.keyword(),
  groupId: s.keyword(),
  country: s.keyword(),
  partnerTagIds: s.string().noStem(),
  partnerTagId: s.keyword(),
  referredByPartnerId: s.keyword(),
  totalClicks: s.number("F64"),
  totalLeads: s.number("F64"),
  totalConversions: s.number("F64"),
  totalSaleAmount: s.number("F64"),
  totalCommissions: s.number("F64"),
  netRevenue: s.number("F64"),
  earningsPerClick: s.number("F64"),
  averageLifetimeValue: s.number("F64"),
  clickToLeadRate: s.number("F64"),
  clickToConversionRate: s.number("F64"),
  leadToConversionRate: s.number("F64"),
  returnOnAdSpend: s.number("F64"),
  createdAt: s.date().fast(),
});

type UpstashPartnerSearchSchema = typeof upstashPartnerSearchSchema;
type UpstashPartnerSearchFilter =
  InferFilterFromSchema<UpstashPartnerSearchSchema>;
type UpstashPartnerSearchIndex = SearchIndex<UpstashPartnerSearchSchema>;

interface UpstashPartnerSearchDocument extends Record<string, unknown> {
  id: string;
  programId: string;
  partnerId: string;
  documentType: typeof DOCUMENT_TYPE_PARTNER | typeof DOCUMENT_TYPE_TAG;
  searchText: string;
  emailNgrams: string;
  status: string;
  tenantId: string;
  groupId: string;
  country: string;
  partnerTagIds: string;
  partnerTagIdsRaw: string[];
  partnerTagId: string;
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
  createdAt: string;
}

interface CreateUpstashRedisPartnerSearchProviderOptions {
  redisClient?: Redis;
  queryRedisClient?: Redis;
  indexName?: string;
}

function getIndexName(indexName?: string): string {
  return (
    indexName ??
    process.env.PARTNER_SEARCH_INDEX_NAME?.trim() ??
    DEFAULT_INDEX_NAME
  );
}

function getDocumentPrefix(indexName: string): string {
  return `${indexName}:`;
}

function getDocumentKey(indexName: string, documentId: string): string {
  return `${getDocumentPrefix(indexName)}partner:${documentId}`;
}

function getTagDocumentKey(
  indexName: string,
  documentId: string,
  partnerTagId: string,
): string {
  return `${getDocumentPrefix(indexName)}tag:${documentId}:${partnerTagId}`;
}

function createRedisClient(requestTimeoutMs: number): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for partner search.",
    );
  }

  return new Redis({
    url,
    token,
    // The provider wrapper owns the retry budget
    retry: { retries: 0 },
    signal: () => AbortSignal.timeout(requestTimeoutMs),
  });
}

function getEmailNgrams(email: string | null): string {
  if (!email) {
    return "";
  }

  const normalized = normalizePartnerSearchQuery(email);
  if (normalized.length < 3) {
    return normalized;
  }

  // Three-character tokens support partial email matches without a leading-wildcard regex query
  return Array.from(
    new Set(
      Array.from({ length: normalized.length - 2 }, (_, index) =>
        normalized.slice(index, index + 3),
      ),
    ),
  ).join(" ");
}

function getQueryNgrams(query: string): string[] {
  if (query.length < 3 || /\s/u.test(query)) {
    return [];
  }

  return Array.from(
    new Set(
      Array.from({ length: query.length - 2 }, (_, index) =>
        query.slice(index, index + 3),
      ),
    ),
  );
}

function serializeUpstashDocument(
  document: PartnerSearchDocument,
  documentType: typeof DOCUMENT_TYPE_PARTNER | typeof DOCUMENT_TYPE_TAG,
  partnerTagId = NULL_VALUE,
): UpstashPartnerSearchDocument {
  return {
    id: document.id,
    programId: document.programId,
    partnerId: document.partnerId,
    documentType,
    searchText: getPartnerSearchableValues(document)
      .map(normalizePartnerSearchQuery)
      .join(" "),
    emailNgrams: getEmailNgrams(document.email),
    status: document.status,
    tenantId: document.tenantId ?? NULL_VALUE,
    groupId: document.groupId ?? NULL_VALUE,
    country: document.country ?? NULL_VALUE,
    partnerTagIds: document.partnerTagIds.join(" "),
    partnerTagIdsRaw: document.partnerTagIds,
    partnerTagId,
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
    createdAt: document.createdAt,
  };
}

function buildListFilter(
  field: "groupId" | "country" | "partnerTagIds",
  filter: PartnerSearchListFilter,
): {
  include?: UpstashPartnerSearchFilter;
  exclude?: UpstashPartnerSearchFilter;
} {
  const condition = {
    [field]: { $in: filter.values },
  } as UpstashPartnerSearchFilter;

  return filter.operator === "IN"
    ? { include: condition }
    : { exclude: condition };
}

function buildTextFilter(query: string): UpstashPartnerSearchFilter {
  // $smart handles word-boundary and prefix matching via the inverted index.
  // Email n-grams handle infix/substring matching (e.g. "examp" in "partner@example.com").
  // A $regex path was intentionally omitted because regex queries scan the
  // inverted index linearly, which degrades p99 latency at 100K+ documents.
  const alternatives: UpstashPartnerSearchFilter[] = [
    { searchText: { $smart: query } },
  ];

  const emailNgrams = getQueryNgrams(query);
  if (emailNgrams.length > 0) {
    alternatives.push({
      $must: emailNgrams.map((ngram) => ({ emailNgrams: ngram })),
    });
  }

  return { $should: alternatives } as unknown as UpstashPartnerSearchFilter;
}

function buildUpstashFilter(
  { programId, query, filters }: PartnerSearchCountQuery,
  documentType:
    | typeof DOCUMENT_TYPE_PARTNER
    | typeof DOCUMENT_TYPE_TAG = DOCUMENT_TYPE_PARTNER,
): UpstashPartnerSearchFilter {
  const must: UpstashPartnerSearchFilter[] = [
    { documentType: { $eq: documentType } },
    { programId: { $eq: programId } },
    buildTextFilter(normalizePartnerSearchQuery(query)),
  ];
  const mustNot: UpstashPartnerSearchFilter[] = [];

  if (filters?.status) {
    must.push({ status: { $eq: filters.status } });
  }
  if (filters?.tenantId) {
    must.push({ tenantId: { $eq: filters.tenantId } });
  }
  if (filters?.partnerIds?.length) {
    must.push({ partnerId: { $in: filters.partnerIds } });
  }

  const listFilters: [
    "groupId" | "country" | "partnerTagIds",
    PartnerSearchListFilter | undefined,
  ][] = [
    ["groupId", filters?.groupIds],
    ["country", filters?.countries],
    ["partnerTagIds", filters?.partnerTagIds],
  ];

  for (const [field, listFilter] of listFilters) {
    if (!listFilter) {
      continue;
    }

    const { include, exclude } = buildListFilter(field, listFilter);
    if (include) {
      must.push(include);
    }
    if (exclude) {
      mustNot.push(exclude);
    }
  }

  if (filters?.referredByPartnerId) {
    must.push({
      referredByPartnerId: { $eq: filters.referredByPartnerId },
    });
  }

  for (const [field, range] of Object.entries(filters?.metrics ?? {})) {
    const condition = {
      ...(range.min !== undefined && { $gte: range.min }),
      ...(range.max !== undefined && { $lte: range.max }),
    };
    must.push({
      [field as PartnerSearchMetricField]: condition,
    } as UpstashPartnerSearchFilter);
  }

  return {
    $must: must,
    ...(mustNot.length > 0 && { $mustNot: mustNot }),
  } as UpstashPartnerSearchFilter;
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
    // A request timeout consumes nearly the full SLA budget, so only retry
    // transient failures such as rate limits and 503s that return quickly
    return await Promise.race([
      withTransientRetry(operation, { retryTimeouts: false }),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function getGroupIndexField(
  field: PartnerSearchGroupField,
): "status" | "country" | "groupId" | "partnerTagId" | "referredByPartnerId" {
  return field;
}

function mapGroupValue(value: string): string | null {
  return value === NULL_VALUE ? null : value;
}

function getSchemaSignature(schema: Record<string, Record<string, unknown>>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(schema)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([field, options]) => [
          field,
          Object.fromEntries(
            Object.entries(options).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
        ]),
    ),
  );
}

function validateIndexDescription(
  description: NonNullable<
    Awaited<ReturnType<UpstashPartnerSearchIndex["describe"]>>
  >,
  indexName: string,
) {
  const expectedPrefix = getDocumentPrefix(indexName);
  const hasExpectedPrefix =
    description.prefixes.length === 1 &&
    description.prefixes[0] === expectedPrefix;
  const hasExpectedSchema =
    getSchemaSignature(
      description.schema as Record<string, Record<string, unknown>>,
    ) ===
    getSchemaSignature(
      upstashPartnerSearchSchema as Record<string, Record<string, unknown>>,
    );

  if (
    description.dataType !== "json" ||
    !hasExpectedPrefix ||
    !hasExpectedSchema
  ) {
    throw new Error(
      `Partner search index ${indexName} does not match the configured schema. Create a new versioned index.`,
    );
  }
}

function getStoredDocument(
  value: UpstashPartnerSearchDocument[] | null,
): UpstashPartnerSearchDocument | null {
  return value?.[0] ?? null;
}

async function getStoredDocuments(
  redisClient: Redis,
  indexName: string,
  documentIds: string[],
): Promise<(UpstashPartnerSearchDocument | null)[]> {
  if (documentIds.length === 0) {
    return [];
  }

  const values = await withTransientRetry(() =>
    redisClient.json.mget<(UpstashPartnerSearchDocument[] | null)[]>(
      documentIds.map((documentId) => getDocumentKey(indexName, documentId)),
      "$",
    ),
  );

  return values.map(getStoredDocument);
}

function getStaleTagDocumentKeys(
  indexName: string,
  documents: PartnerSearchDocument[],
  storedDocuments: (UpstashPartnerSearchDocument | null)[],
): string[] {
  return documents.flatMap((document, index) => {
    const currentTagIds = new Set(document.partnerTagIds);
    return (storedDocuments[index]?.partnerTagIdsRaw ?? [])
      .filter((partnerTagId) => !currentTagIds.has(partnerTagId))
      .map((partnerTagId) =>
        getTagDocumentKey(indexName, document.id, partnerTagId),
      );
  });
}

function getUpsertEntries(
  indexName: string,
  documents: PartnerSearchDocument[],
) {
  return documents.flatMap((document) => [
    {
      key: getDocumentKey(indexName, document.id),
      path: "$",
      value: serializeUpstashDocument(document, DOCUMENT_TYPE_PARTNER),
    },
    ...document.partnerTagIds.map((partnerTagId) => ({
      key: getTagDocumentKey(indexName, document.id, partnerTagId),
      path: "$",
      value: serializeUpstashDocument(
        document,
        DOCUMENT_TYPE_TAG,
        partnerTagId,
      ),
    })),
  ]);
}

async function upsertDocumentBatch(
  redisClient: Redis,
  indexName: string,
  documents: PartnerSearchDocument[],
) {
  const storedDocuments = await getStoredDocuments(
    redisClient,
    indexName,
    documents.map(({ id }) => id),
  );
  const staleTagDocumentKeys = getStaleTagDocumentKeys(
    indexName,
    documents,
    storedDocuments,
  );
  const upsertEntries = getUpsertEntries(indexName, documents);

  // Keep stale tag cleanup and document upserts in one transaction so another
  // synchronization cannot modify the same keys between these operations
  await withTransientRetry(async () => {
    const transaction = redisClient.multi();

    if (staleTagDocumentKeys.length > 0) {
      transaction.del(...staleTagDocumentKeys);
    }

    transaction.json.mset(...upsertEntries);
    await transaction.exec();
  });
}

async function deleteDocumentBatch(
  redisClient: Redis,
  indexName: string,
  documentIds: string[],
) {
  // Read the batch once and derive exact tag keys rather than scanning the
  // entire Redis keyspace for each partner
  const storedDocuments = await getStoredDocuments(
    redisClient,
    indexName,
    documentIds,
  );
  const tagDocumentKeys = storedDocuments.flatMap((document, index) =>
    (document?.partnerTagIdsRaw ?? []).map((partnerTagId) =>
      getTagDocumentKey(indexName, documentIds[index]!, partnerTagId),
    ),
  );

  await withTransientRetry(() =>
    redisClient.del(
      ...documentIds.map((documentId) => getDocumentKey(indexName, documentId)),
      ...tagDocumentKeys,
    ),
  );
}

export async function createUpstashRedisPartnerSearchIndex({
  redisClient,
  indexName,
}: CreateUpstashRedisPartnerSearchProviderOptions = {}) {
  const resolvedRedisClient =
    redisClient ?? createRedisClient(WRITE_REQUEST_TIMEOUT_MS);
  const resolvedIndexName = getIndexName(indexName);

  const index = await resolvedRedisClient.search.createIndex({
    name: resolvedIndexName,
    dataType: "json",
    prefix: getDocumentPrefix(resolvedIndexName),
    schema: upstashPartnerSearchSchema,
    skipInitialScan: true,
    existsOk: true,
  });
  const description = await index.describe();

  if (!description) {
    throw new Error(
      `Partner search index ${resolvedIndexName} was not created.`,
    );
  }

  validateIndexDescription(description, resolvedIndexName);
  return index;
}

export function createUpstashRedisPartnerSearchProvider({
  redisClient,
  queryRedisClient,
  indexName,
}: CreateUpstashRedisPartnerSearchProviderOptions = {}): PartnerSearchProvider {
  const resolvedRedisClient =
    redisClient ?? createRedisClient(WRITE_REQUEST_TIMEOUT_MS);
  const resolvedQueryRedisClient =
    queryRedisClient ??
    redisClient ??
    createRedisClient(QUERY_REQUEST_TIMEOUT_MS);
  const resolvedIndexName = getIndexName(indexName);
  const queryIndex: UpstashPartnerSearchIndex =
    resolvedQueryRedisClient.search.index({
      name: resolvedIndexName,
      schema: upstashPartnerSearchSchema,
    });
  const writeIndex: UpstashPartnerSearchIndex =
    resolvedRedisClient.search.index({
      name: resolvedIndexName,
      schema: upstashPartnerSearchSchema,
    });

  return {
    async search(query: PartnerSearchQuery) {
      const filter = buildUpstashFilter(query);
      const offset = (query.page - 1) * query.pageSize;
      const orderBy = query.sort
        ? ({
            [query.sort.field]: query.sort.order.toUpperCase(),
          } as Record<string, "ASC" | "DESC">)
        : undefined;

      const results = await withQueryDeadline(() =>
        queryIndex.query({
          filter,
          limit: query.pageSize,
          offset,
          select: { id: true, partnerId: true },
          ...(orderBy && { orderBy }),
        }),
      );

      return {
        hits: results.map(({ data, score }) => ({
          id: data.id,
          partnerId: data.partnerId,
          score,
        })),
      };
    },

    async count(query) {
      const result = await withQueryDeadline(() =>
        queryIndex.count({ filter: buildUpstashFilter(query) }),
      );
      return result.count;
    },

    async groupBy(query, field): Promise<PartnerSearchGroup[]> {
      const indexField = getGroupIndexField(field);
      const documentType =
        field === "partnerTagId" ? DOCUMENT_TYPE_TAG : DOCUMENT_TYPE_PARTNER;
      const result = await withQueryDeadline(() =>
        queryIndex.aggregate({
          filter: buildUpstashFilter(query, documentType),
          aggregations: {
            groups: {
              $terms: {
                field: indexField,
                size: MAX_GROUPS,
              },
            },
          },
        }),
      );

      const { buckets, sumOtherDocCount } = result.groups;

      if (buckets.length >= MAX_GROUPS) {
        console.warn(
          `[Partner Search] groupBy("${field}") returned ${buckets.length} buckets (limit: ${MAX_GROUPS}). ` +
            `Results may be truncated (${sumOtherDocCount ?? "unknown"} docs in unlisted groups).`,
        );
      }

      return buckets.flatMap(({ key, docCount }) => {
        const value = mapGroupValue(key);
        if (field === "referredByPartnerId" && value === null) {
          return [];
        }
        return [{ value, count: docCount }];
      });
    },

    async waitForIndexing() {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                `Partner search waitForIndexing timed out after ${WAIT_FOR_INDEXING_TIMEOUT_MS}ms.`,
              ),
            ),
          WAIT_FOR_INDEXING_TIMEOUT_MS,
        );
      });

      let result: number;
      try {
        result = await Promise.race([
          withTransientRetry(() => writeIndex.waitIndexing()),
          timeout,
        ]);
      } finally {
        clearTimeout(timeoutId);
      }

      if (result === 0) {
        throw new Error(
          `Partner search index ${resolvedIndexName} was not found.`,
        );
      }
    },

    async upsert(documents) {
      for (const documentBatch of chunk(documents, WRITE_BATCH_SIZE)) {
        await upsertDocumentBatch(
          resolvedRedisClient,
          resolvedIndexName,
          documentBatch,
        );
      }
    },

    async delete(documentIds) {
      for (const documentIdBatch of chunk(documentIds, WRITE_BATCH_SIZE)) {
        await deleteDocumentBatch(
          resolvedRedisClient,
          resolvedIndexName,
          documentIdBatch,
        );
      }
    },
  };
}
