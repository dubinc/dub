import {
  createUpstashRedisPartnerSearchProvider,
  normalizePartnerSearchQuery,
  type PartnerSearchHit,
  type PartnerSearchSortField,
} from "@/lib/api/partners/search";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-positive-integer";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { Redis } from "@upstash/redis";
import "dotenv-flow/config";

const DEFAULT_INDEX_NAME = "partner-search-v1";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const SCAN_COUNT = 1_000;
const SORT_FIELDS: PartnerSearchSortField[] = [
  "createdAt",
  "totalClicks",
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
  "netRevenue",
  "earningsPerClick",
  "averageLifetimeValue",
  "clickToLeadRate",
  "clickToConversionRate",
  "leadToConversionRate",
  "returnOnAdSpend",
];

interface DebugArguments {
  programId: string;
  query: string;
  limit: number;
  sortBy: PartnerSearchSortField;
  sortOrder: "asc" | "desc";
  status?: ProgramEnrollmentStatus;
}

interface IndexedPartnerDocument extends Record<string, unknown> {
  id: string;
  partnerId: string;
  searchText: string;
}

function parseArguments(args: string[]): DebugArguments {
  let programId: string | undefined;
  let query: string | undefined;
  let limit = DEFAULT_LIMIT;
  let sortBy: PartnerSearchSortField = "totalSaleAmount";
  let sortOrder: "asc" | "desc" = "desc";
  let status: ProgramEnrollmentStatus | undefined;

  for (const arg of args) {
    if (arg.startsWith("--programId=")) {
      programId = arg.slice("--programId=".length);
    } else if (arg.startsWith("--query=")) {
      query = arg.slice("--query=".length);
    } else if (arg.startsWith("--limit=")) {
      limit = parsePositiveInteger(arg.slice("--limit=".length), "--limit");
    } else if (arg.startsWith("--sortBy=")) {
      const value = arg.slice("--sortBy=".length) as PartnerSearchSortField;
      if (!SORT_FIELDS.includes(value)) {
        throw new Error(`--sortBy must be one of: ${SORT_FIELDS.join(", ")}.`);
      }
      sortBy = value;
    } else if (arg.startsWith("--sortOrder=")) {
      const value = arg.slice("--sortOrder=".length);
      if (value !== "asc" && value !== "desc") {
        throw new Error("--sortOrder must be asc or desc.");
      }
      sortOrder = value;
    } else if (arg.startsWith("--status=")) {
      const value = arg.slice("--status=".length) as ProgramEnrollmentStatus;
      if (!Object.values(ProgramEnrollmentStatus).includes(value)) {
        throw new Error(
          `--status must be one of: ${Object.values(ProgramEnrollmentStatus).join(", ")}.`,
        );
      }
      status = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!programId) {
    throw new Error("--programId is required.");
  }
  if (!query?.trim()) {
    throw new Error("--query is required.");
  }
  if (limit > MAX_LIMIT) {
    throw new Error(`--limit cannot exceed ${MAX_LIMIT}.`);
  }

  return { programId, query, limit, sortBy, sortOrder, status };
}

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.",
    );
  }

  return new Redis({ url, token });
}

async function countStoredDocuments(redis: Redis, indexName: string) {
  let cursor = "0";
  let partners = 0;
  let tags = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: `${indexName}:*`,
      count: SCAN_COUNT,
    });

    partners += keys.filter((key) => key.includes(":partner:")).length;
    tags += keys.filter((key) => key.includes(":tag:")).length;
    cursor = nextCursor;
  } while (cursor !== "0");

  return { partners, tags, total: partners + tags };
}

async function getIndexedDocuments(
  redis: Redis,
  indexName: string,
  hits: PartnerSearchHit[],
) {
  const documentIds = Array.from(new Set(hits.map(({ id }) => id)));
  if (documentIds.length === 0) {
    return new Map<string, IndexedPartnerDocument>();
  }

  const values = await redis.json.mget<(IndexedPartnerDocument[] | null)[]>(
    documentIds.map((documentId) => `${indexName}:partner:${documentId}`),
    "$",
  );

  return new Map(
    values.flatMap((value) => {
      const document = value?.[0];
      return document ? [[document.id, document] as const] : [];
    }),
  );
}

async function getDatabaseDocuments(hits: PartnerSearchHit[]) {
  const documentIds = Array.from(new Set(hits.map(({ id }) => id)));
  const enrollments = await prisma.programEnrollment.findMany({
    where: { id: { in: documentIds } },
    select: {
      id: true,
      partner: {
        select: {
          name: true,
          email: true,
          companyName: true,
        },
      },
    },
  });

  return new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
}

function reportResults({
  label,
  hits,
  indexedDocuments,
  databaseDocuments,
  sortBy,
  normalizedQuery,
}: {
  label: string;
  hits: PartnerSearchHit[];
  indexedDocuments: Map<string, IndexedPartnerDocument>;
  databaseDocuments: Awaited<ReturnType<typeof getDatabaseDocuments>>;
  sortBy: PartnerSearchSortField;
  normalizedQuery: string;
}) {
  console.log(`\n${label}`);
  console.table(
    hits.map((hit, index) => {
      const indexedDocument = indexedDocuments.get(hit.id);
      const databaseDocument = databaseDocuments.get(hit.id);

      return {
        rank: index + 1,
        score: hit.score,
        indexedSortValue: indexedDocument?.[sortBy] ?? null,
        containsQuery: indexedDocument?.searchText.includes(normalizedQuery),
        enrollmentId: hit.id,
        partnerId: hit.partnerId,
        name: databaseDocument?.partner.name ?? "missing from database",
        email: databaseDocument?.partner.email ?? null,
        company: databaseDocument?.partner.companyName ?? null,
      };
    }),
  );
}

async function main() {
  const { programId, query, limit, sortBy, sortOrder, status } = parseArguments(
    process.argv.slice(2),
  );
  const redis = createRedisClient();
  const indexName =
    process.env.PARTNER_SEARCH_INDEX_NAME?.trim() || DEFAULT_INDEX_NAME;
  const index = redis.search.index({ name: indexName });
  const description = await index.describe();

  if (!description) {
    throw new Error(`Partner search index ${indexName} does not exist.`);
  }

  const searchProvider = createUpstashRedisPartnerSearchProvider({
    redisClient: redis,
    indexName,
  });
  const filters = status ? { status } : undefined;
  const baseQuery = { programId, query, filters };
  const startedAt = performance.now();

  // Step 1: Compare relevance ranking with the website's field-sorted query
  const [matchingDocuments, relevanceResult, sortedResult, storedDocuments] =
    await Promise.all([
      searchProvider.count(baseQuery),
      searchProvider.search({
        ...baseQuery,
        page: 1,
        pageSize: limit,
      }),
      searchProvider.search({
        ...baseQuery,
        page: 1,
        pageSize: limit,
        sort: { field: sortBy, order: sortOrder },
      }),
      countStoredDocuments(redis, indexName),
    ]);

  const allHits = [...relevanceResult.hits, ...sortedResult.hits];

  // Step 2: Read the same hits from Redis and the database for comparison
  const [indexedDocuments, databaseDocuments] = await Promise.all([
    getIndexedDocuments(redis, indexName, allHits),
    getDatabaseDocuments(allHits),
  ]);

  console.log("Partner search debug summary");
  console.table({
    indexName,
    programId,
    query,
    normalizedQuery: normalizePartnerSearchQuery(query),
    status: status ?? "all",
    matchingDocuments,
    storedPartnerDocuments: storedDocuments.partners,
    storedTagDocuments: storedDocuments.tags,
    storedDocuments: storedDocuments.total,
    elapsedMs: (performance.now() - startedAt).toFixed(1),
  });

  reportResults({
    label: "Relevance order — score is text relevance",
    hits: relevanceResult.hits,
    indexedDocuments,
    databaseDocuments,
    sortBy,
    normalizedQuery: normalizePartnerSearchQuery(query),
  });
  reportResults({
    label: `${sortBy} ${sortOrder} — score is the indexed sort value`,
    hits: sortedResult.hits,
    indexedDocuments,
    databaseDocuments,
    sortBy,
    normalizedQuery: normalizePartnerSearchQuery(query),
  });
}

main()
  .catch((error) => {
    console.error("Partner search debug failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
