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
  PartnerSearchCandidateQuery,
  PartnerSearchDocument,
  PartnerSearchProvider,
} from "../types";
import { validatePartnerSearchCandidateLimit } from "../types";
import {
  withDeadline,
  withQueryDeadline,
  withTransientRetry,
} from "./resilience";
import {
  getEmailNgrams,
  getQueryNgrams,
  logPartnerSearchDebug,
  resolveIndexName,
} from "./shared";

const DEFAULT_INDEX_NAME = "partner-search-v1";
// Keep the full query operation within the one-second latency target while
// leaving a small window to retry failures that return quickly
const QUERY_REQUEST_TIMEOUT_MS = 900;
const QUERY_OPERATION_TIMEOUT_MS = 1_000;
const WRITE_REQUEST_TIMEOUT_MS = 10_000;
const WRITE_BATCH_SIZE = 100;
const WAIT_FOR_INDEXING_TIMEOUT_MS = 30_000;

export const upstashPartnerSearchSchema = s.object({
  programId: s.keyword(),
  searchText: s.string().noStem(),
  emailNgrams: s.string().noStem(),
});

type UpstashPartnerSearchSchema = typeof upstashPartnerSearchSchema;
type UpstashPartnerSearchFilter =
  InferFilterFromSchema<UpstashPartnerSearchSchema>;
type UpstashPartnerSearchIndex = SearchIndex<UpstashPartnerSearchSchema>;

interface UpstashPartnerSearchDocument extends Record<string, unknown> {
  programId: string;
  searchText: string;
  emailNgrams: string;
}

interface CreateUpstashRedisPartnerSearchProviderOptions {
  redisClient?: Redis;
  queryRedisClient?: Redis;
  indexName?: string;
}

function getIndexName(indexName?: string): string {
  return resolveIndexName(
    [indexName, process.env.PARTNER_SEARCH_INDEX_NAME],
    DEFAULT_INDEX_NAME,
  );
}

function getDocumentPrefix(indexName: string): string {
  return `${indexName}:partner:`;
}

function getDocumentKey(indexName: string, documentId: string): string {
  return `${getDocumentPrefix(indexName)}${documentId}`;
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

function serializeUpstashDocument(
  document: PartnerSearchDocument,
): UpstashPartnerSearchDocument {
  return {
    programId: document.programId,
    searchText: getPartnerSearchableValues(document)
      .map(normalizePartnerSearchQuery)
      .join(" "),
    emailNgrams: getEmailNgrams(document.email),
  };
}

function buildTextAlternatives(query: string): UpstashPartnerSearchFilter[][] {
  // $smart handles word-boundary and prefix matching via the inverted index.
  // Email n-grams handle infix/substring matching (e.g. "examp" in "partner@example.com").
  // A $regex path was intentionally omitted because regex queries scan the
  // inverted index linearly, which degrades p99 latency at 100K+ documents.
  const alternatives: UpstashPartnerSearchFilter[][] = [
    [{ searchText: { $smart: query } }],
  ];

  const emailNgrams = getQueryNgrams(query);
  if (emailNgrams.length > 0) {
    // Require exact trigrams so smart matching cannot fuzzy-match unrelated emails
    alternatives.push(
      emailNgrams.map((ngram) => ({
        emailNgrams: { $eq: ngram },
      })),
    );
  }

  return alternatives;
}

function buildUpstashFilter({
  programId,
  query,
}: Pick<
  PartnerSearchCandidateQuery,
  "programId" | "query"
>): UpstashPartnerSearchFilter {
  // Each branch includes the program scope because a root-level $must would
  // turn the sibling $should clauses into optional score boosts. Keeping both
  // requirements in every branch prevents unrelated program documents from
  // being returned with low scores.
  return {
    $should: buildTextAlternatives(normalizePartnerSearchQuery(query)).map(
      (textConditions) => ({
        $must: [{ programId: { $eq: programId } }, ...textConditions],
      }),
    ),
  } as UpstashPartnerSearchFilter;
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
      `Partner search index ${indexName} does not match the configured schema. Delete and recreate it before backfilling.`,
    );
  }
}

function getUpsertEntries(
  indexName: string,
  documents: PartnerSearchDocument[],
) {
  return documents.map((document) => ({
    key: getDocumentKey(indexName, document.id),
    path: "$",
    value: serializeUpstashDocument(document),
  }));
}

async function upsertDocumentBatch(
  redisClient: Redis,
  indexName: string,
  documents: PartnerSearchDocument[],
) {
  const upsertEntries = getUpsertEntries(indexName, documents);

  await withTransientRetry(() => redisClient.json.mset(...upsertEntries));
}

async function deleteDocumentBatch(
  redisClient: Redis,
  indexName: string,
  documentIds: string[],
) {
  await withTransientRetry(() =>
    redisClient.del(
      ...documentIds.map((documentId) => getDocumentKey(indexName, documentId)),
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
  // Hand back the description so callers can report on the index without
  // paying for a second describe() round trip.
  return { index, description };
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

  async function findCandidates({
    programId,
    query,
    limit,
  }: PartnerSearchCandidateQuery) {
    validatePartnerSearchCandidateLimit(limit);
    const filter = buildUpstashFilter({ programId, query });
    const results = await withQueryDeadline(
      () => queryIndex.query({ filter, limit, select: {} }),
      QUERY_OPERATION_TIMEOUT_MS,
    );
    const hits = results.map(({ key, score }) => ({
      id: key.slice(getDocumentPrefix(resolvedIndexName).length),
      score,
    }));

    logPartnerSearchDebug("Upstash Redis Search", {
      indexName: resolvedIndexName,
      operation: "searchCandidates",
      query: { programId, query, limit },
      filter,
      resultCount: hits.length,
      hits,
    });

    return { hits };
  }

  return {
    searchCandidates: findCandidates,

    async waitForIndexing() {
      const result = await withDeadline(
        () => withTransientRetry(() => writeIndex.waitIndexing()),
        WAIT_FOR_INDEXING_TIMEOUT_MS,
        `Partner search waitForIndexing timed out after ${WAIT_FOR_INDEXING_TIMEOUT_MS}ms.`,
      );

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
