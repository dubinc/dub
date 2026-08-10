import {
  getPartnerSearchableValues,
  getPartnerSearchProvider,
  getPartnerSearchProviderName,
  normalizePartnerSearchQuery,
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
  type PartnerSearchDocument,
  type PartnerSearchHit,
} from "@/lib/api/partners/search";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-cli-number";
import { ProgramEnrollmentStatus } from "@prisma/client";
import "dotenv-flow/config";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = PARTNER_SEARCH_CANDIDATE_LIMIT;

interface DebugArguments {
  programId: string;
  query: string;
  limit: number;
  status?: ProgramEnrollmentStatus;
}

function parseArguments(args: string[]): DebugArguments {
  let programId: string | undefined;
  let query: string | undefined;
  let limit = DEFAULT_LIMIT;
  let status: ProgramEnrollmentStatus | undefined;

  for (const arg of args) {
    if (arg.startsWith("--programId=")) {
      programId = arg.slice("--programId=".length);
    } else if (arg.startsWith("--query=")) {
      query = arg.slice("--query=".length);
    } else if (arg.startsWith("--limit=")) {
      limit = parsePositiveInteger(arg.slice("--limit=".length), "--limit");
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

  return { programId, query, limit, status };
}

async function getDatabaseDocuments(
  hits: PartnerSearchHit[],
  status?: ProgramEnrollmentStatus,
) {
  const documentIds = Array.from(new Set(hits.map(({ id }) => id)));
  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      id: { in: documentIds },
      ...(status ? { status } : {}),
    },
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
  normalizedQuery,
}: {
  label: string;
  hits: PartnerSearchHit[];
  databaseDocuments: Awaited<ReturnType<typeof getDatabaseDocuments>>;
  normalizedQuery: string;
}) {
  console.log(`\n${label}`);
  console.table(
    hits.map((hit, index) => {
      const databaseDocument = databaseDocuments.get(hit.id);

      return {
        rank: index + 1,
        providerScore: hit.score,
        containsLiteralQuery: containsLiteralQuery(
          databaseDocument,
          normalizedQuery,
        ),
        enrollmentId: hit.id,
        partnerId: databaseDocument?.partnerId ?? "missing from database",
        name: databaseDocument?.name ?? "missing from database",
        email: databaseDocument?.email ?? null,
        company: databaseDocument?.companyName ?? null,
      };
    }),
  );
}

async function main() {
  const { programId, query, limit, status } = parseArguments(
    process.argv.slice(2),
  );
  const searchProvider = getPartnerSearchProvider();
  if (!searchProvider) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  const providerName = getPartnerSearchProviderName();
  const startedAt = performance.now();

  // Step 1: Fetch the same relevance candidates used by the website
  const relevanceResult = await searchProvider.searchCandidates({
    programId,
    query,
    limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
  });

  // Step 2: Apply the requested status while loading canonical database documents
  const databaseDocuments = await getDatabaseDocuments(
    relevanceResult.hits,
    status,
  );
  const databaseMatchedHits = relevanceResult.hits.filter(({ id }) =>
    databaseDocuments.has(id),
  );
  const filteredHits = databaseMatchedHits.slice(0, limit);

  console.log("Partner search debug summary");
  console.table({
    provider: providerName,
    programId,
    query,
    normalizedQuery: normalizePartnerSearchQuery(query),
    status: status ?? "all",
    candidates: relevanceResult.hits.length,
    databaseMatches: databaseMatchedHits.length,
    elapsedMs: (performance.now() - startedAt).toFixed(1),
  });
  console.log(
    "Provider scores are provider-defined. Compare result order and database values across providers.",
  );

  reportResults({
    label: "Provider relevance order",
    hits: filteredHits,
    databaseDocuments,
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
