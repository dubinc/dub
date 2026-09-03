import {
  getPartnerSearchableValues,
  getPartnerSearchProvider,
  normalizePartnerSearchQuery,
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
  type PartnerSearchDocument,
  type PartnerSearchHit,
} from "@/lib/api/partners/search";
import { PARTNER_SEARCH_NAMESPACE } from "@/lib/api/partners/search/providers/turbopuffer";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-cli-number";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { Turbopuffer } from "@turbopuffer/turbopuffer";
import "dotenv-flow/config";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = PARTNER_SEARCH_CANDIDATE_LIMIT;

interface DebugArguments {
  programId: string;
  query: string;
  limit: number;
  status?: ProgramEnrollmentStatus;
  searchOnly: boolean;
}

function parseArguments(args: string[]): DebugArguments {
  let programId: string | undefined;
  let query: string | undefined;
  let limit = DEFAULT_LIMIT;
  let status: ProgramEnrollmentStatus | undefined;
  let searchOnly = false;

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
    } else if (arg === "--searchOnly") {
      searchOnly = true;
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
  // Status lives on the enrollment row, so filtering by it needs the database.
  if (searchOnly && status) {
    throw new Error("--searchOnly cannot be combined with --status.");
  }

  return { programId, query, limit, status, searchOnly };
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

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Reads the indexed `searchText` back out of turbopuffer for the hits.
 *
 * Debug-only: `searchCandidates` asks for no attributes, because the API only
 * ever needs IDs. This exists so --searchOnly can show what was indexed when the
 * rows are not in the local database, such as a production index against a seeded one.
 */
async function fetchIndexedText(ids: string[]): Promise<Map<string, string>> {
  const apiKey = process.env.TURBOPUFFER_API_KEY;

  if (!apiKey || ids.length === 0) {
    return new Map();
  }

  const namespace = new Turbopuffer({
    apiKey,
    region: "aws-us-east-1",
  }).namespace(PARTNER_SEARCH_NAMESPACE);
  const { rows } = await namespace.query({
    rank_by: ["id", "asc"],
    top_k: ids.length,
    filters: ["id", "In", ids],
    include_attributes: ["searchText"],
  });

  return new Map(
    (rows ?? []).map((row) => [String(row.id), String(row.searchText ?? "")]),
  );
}

const PLATFORM_TYPES = [
  "website",
  "youtube",
  "twitter",
  "linkedin",
  "instagram",
  "tiktok",
];

/**
 * `searchText` is every searchable value lowercased and space-joined in a fixed
 * order: partner ID, name, email, company, description, platform types, handles,
 * then link keys. Three of those boundaries are recoverable, since the ID is
 * prefixed, the email is address-shaped, and the platform types are a known
 * enum, so the blob splits into name / profile / platforms-and-keys. A document
 * without platforms has no recoverable boundary after the email, so everything
 * past it stays together as `profile`.
 */
function parseIndexedText(searchText: string) {
  const tokens = searchText.split(" ").filter(Boolean);
  const hasPartnerId = tokens[0]?.startsWith("pn_") ?? false;
  const emailIndex = tokens.findIndex((token) => EMAIL_PATTERN.test(token));
  // Without an email there is no boundary after the name, so it is assumed to
  // end at the fourth token, and the profile starts where the name ends.
  const nameEnd = emailIndex === -1 ? 4 : emailIndex;
  const profileStart = emailIndex === -1 ? nameEnd : emailIndex + 1;
  const platformIndex = tokens.findIndex(
    (token, index) => index >= profileStart && PLATFORM_TYPES.includes(token),
  );

  return {
    tokens,
    name: tokens.slice(hasPartnerId ? 1 : 0, nameEnd).join(" "),
    email: emailIndex === -1 ? "" : tokens[emailIndex],
    profile: tokens
      .slice(profileStart, platformIndex === -1 ? undefined : platformIndex)
      .join(" "),
    platformsAndKeys:
      platformIndex === -1 ? "" : tokens.slice(platformIndex).join(" "),
  };
}

/**
 * How often each query term occurs, and how long the document is. Both drive the
 * BM25 score: term frequency raises it, and length normalization (b=0.75) pushes
 * it back down, so a partner with many links can rank below a shorter document
 * that matched fewer of the query's terms.
 */
function summarizeTermMatches(tokens: string[], normalizedQuery: string) {
  const queryTerms = normalizedQuery.split(/\s+/u).filter(Boolean);

  return queryTerms
    .map((term) => {
      const count = tokens.filter((token) => token.startsWith(term)).length;
      return `${term}×${count}`;
    })
    .join(" ");
}

/**
 * Everything the provider returns on its own: an ID and a score. Names, emails,
 * and the literal-match check all come from the database, so --searchOnly trades
 * them for a run that needs no DATABASE_URL.
 */
function reportProviderHits(
  hits: PartnerSearchHit[],
  indexedText: Map<string, string>,
  normalizedQuery: string,
) {
  console.table(
    hits.map((hit, index) => {
      const parsed = parseIndexedText(indexedText.get(hit.id) ?? "");

      return {
        rank: index + 1,
        score: hit.score?.toFixed(5),
        name: parsed.name,
        email: parsed.email,
        docTokens: parsed.tokens.length,
        queryTerms: summarizeTermMatches(parsed.tokens, normalizedQuery),
      };
    }),
  );

  if (indexedText.size === 0) {
    return;
  }

  console.log("\nIndexed document per hit");
  hits.forEach((hit, index) => {
    const parsed = parseIndexedText(indexedText.get(hit.id) ?? "");
    console.log(`\n${index + 1}. ${hit.id}`);
    console.log(`   profile         ${parsed.profile.slice(0, 150) || "—"}`);
    console.log(
      `   platforms+keys  ${parsed.platformsAndKeys.slice(0, 150) || "—"}`,
    );
    // The parsed sections are heuristic. The raw text is the ground truth for
    // checking what a document actually contains, so it is never truncated.
    console.log(`   raw             ${indexedText.get(hit.id) ?? ""}`);
  });
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
  const { programId, query, limit, status, searchOnly } = parseArguments(
    process.argv.slice(2),
  );
  const searchProvider = getPartnerSearchProvider();
  if (!searchProvider) {
    throw new Error("TURBOPUFFER_API_KEY is not configured.");
  }

  const startedAt = performance.now();

  // Step 1: Fetch the same relevance candidates used by the website
  const relevanceResult = await searchProvider.searchCandidates({
    programId,
    query,
    limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
  });

  const normalizedQuery = normalizePartnerSearchQuery(query);

  if (searchOnly) {
    console.log("Partner search debug summary");
    console.table({
      programId,
      query,
      normalizedQuery,
      candidates: relevanceResult.hits.length,
      elapsedMs: (performance.now() - startedAt).toFixed(1),
    });

    const pageHits = relevanceResult.hits.slice(0, limit);
    const indexedText = await fetchIndexedText(pageHits.map(({ id }) => id));

    console.log(
      "\nProvider relevance order (provider only, no database reads)",
    );
    reportProviderHits(pageHits, indexedText, normalizedQuery);
    return;
  }

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
    programId,
    query,
    normalizedQuery,
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
    normalizedQuery,
  });
}

main()
  .catch((error) => {
    console.error("Partner search debug failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
