import {
  getPartnerSearchableValues,
  getPartnerSearchProvider,
  normalizePartnerSearchQuery,
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
  type PartnerSearchDocument,
  type PartnerSearchHit,
  type PartnerSearchSortField,
} from "@/lib/api/partners/search";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-positive-integer";
import { ProgramEnrollmentStatus } from "@prisma/client";
import "dotenv-flow/config";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
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

async function getDatabaseDocuments(hits: PartnerSearchHit[]) {
  const documentIds = Array.from(new Set(hits.map(({ id }) => id)));
  const enrollments = await prisma.programEnrollment.findMany({
    where: { id: { in: documentIds } },
    select: partnerSearchDocumentSelect,
  });

  return new Map(
    enrollments.map((enrollment) => {
      const document = serializePartnerSearchDocument(enrollment);
      return [document.id, document] as const;
    }),
  );
}

function containsLiteralQuery(
  document: PartnerSearchDocument | undefined,
  normalizedQuery: string,
) {
  return document
    ? getPartnerSearchableValues(document).some((value) =>
        normalizePartnerSearchQuery(value).includes(normalizedQuery),
      )
    : false;
}

function reportResults({
  label,
  hits,
  databaseDocuments,
  sortBy,
  normalizedQuery,
}: {
  label: string;
  hits: PartnerSearchHit[];
  databaseDocuments: Awaited<ReturnType<typeof getDatabaseDocuments>>;
  sortBy: PartnerSearchSortField;
  normalizedQuery: string;
}) {
  console.log(`\n${label}`);
  console.table(
    hits.map((hit, index) => {
      const databaseDocument = databaseDocuments.get(hit.id);

      return {
        rank: index + 1,
        providerScore: hit.score,
        databaseSortValue: databaseDocument?.[sortBy] ?? null,
        containsLiteralQuery: containsLiteralQuery(
          databaseDocument,
          normalizedQuery,
        ),
        enrollmentId: hit.id,
        partnerId: hit.partnerId,
        name: databaseDocument?.name ?? "missing from database",
        email: databaseDocument?.email ?? null,
        company: databaseDocument?.companyName ?? null,
      };
    }),
  );
}

async function main() {
  const { programId, query, limit, sortBy, sortOrder, status } = parseArguments(
    process.argv.slice(2),
  );
  const searchProvider = getPartnerSearchProvider();
  if (!searchProvider) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  const providerName = process.env.PARTNER_SEARCH_PROVIDER?.trim();
  const filters = status ? { status } : undefined;
  const baseQuery = { programId, query, filters };
  const startedAt = performance.now();

  // Step 1: Compare relevance ranking with the website's field-sorted query
  const [matchingDocuments, relevanceResult, sortedResult] = await Promise.all([
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
  ]);

  const allHits = [...relevanceResult.hits, ...sortedResult.hits];

  // Step 2: Build the canonical search documents from the database for comparison
  const databaseDocuments = await getDatabaseDocuments(allHits);

  console.log("Partner search debug summary");
  console.table({
    provider: providerName,
    programId,
    query,
    normalizedQuery: normalizePartnerSearchQuery(query),
    status: status ?? "all",
    matchingDocuments,
    elapsedMs: (performance.now() - startedAt).toFixed(1),
  });
  console.log(
    "Provider scores are provider-defined. Compare result order and database values across providers.",
  );

  reportResults({
    label: "Provider relevance order",
    hits: relevanceResult.hits,
    databaseDocuments,
    sortBy,
    normalizedQuery: normalizePartnerSearchQuery(query),
  });
  reportResults({
    label: `${sortBy} ${sortOrder} — explicit field order`,
    hits: sortedResult.hits,
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
