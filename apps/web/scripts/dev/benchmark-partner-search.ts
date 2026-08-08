import { getPartners } from "@/lib/api/partners/get-partners";
import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import {
  getPartnerSearchProvider,
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
  type PartnerSearchDocument,
} from "@/lib/api/partners/search";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-positive-integer";
import "dotenv-flow/config";

const DEFAULT_REQUESTS = 1_000;
const DEFAULT_WARMUP_REQUESTS = 50;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_THRESHOLD_MS = 1_000;
const MINIMUM_REQUESTS = 1_000;
const MINIMUM_PARTNERS = 100_000;

interface BenchmarkArguments {
  programId: string;
  requests: number;
  warmupRequests: number;
  concurrency: number;
  pageSize: number;
  thresholdMs: number;
}

interface SearchCase {
  field: string;
  query: string;
}

interface BenchmarkResult {
  field: string;
  query: string;
  latencyMs: number;
}

function parseArguments(args: string[]): BenchmarkArguments {
  let programId: string | undefined;
  let requests = DEFAULT_REQUESTS;
  let warmupRequests = DEFAULT_WARMUP_REQUESTS;
  let concurrency = DEFAULT_CONCURRENCY;
  let pageSize = DEFAULT_PAGE_SIZE;
  let thresholdMs = DEFAULT_THRESHOLD_MS;

  for (const arg of args) {
    if (arg.startsWith("--programId=")) {
      programId = arg.slice("--programId=".length);
    } else if (arg.startsWith("--requests=")) {
      requests = parsePositiveInteger(
        arg.slice("--requests=".length),
        "--requests",
      );
    } else if (arg.startsWith("--warmup=")) {
      warmupRequests = parsePositiveInteger(
        arg.slice("--warmup=".length),
        "--warmup",
      );
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = parsePositiveInteger(
        arg.slice("--concurrency=".length),
        "--concurrency",
      );
    } else if (arg.startsWith("--pageSize=")) {
      pageSize = parsePositiveInteger(
        arg.slice("--pageSize=".length),
        "--pageSize",
      );
    } else if (arg.startsWith("--thresholdMs=")) {
      thresholdMs = parsePositiveInteger(
        arg.slice("--thresholdMs=".length),
        "--thresholdMs",
      );
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!programId) {
    throw new Error("--programId is required.");
  }
  if (requests < MINIMUM_REQUESTS) {
    throw new Error(
      `--requests must be at least ${MINIMUM_REQUESTS} for a useful p99 measurement.`,
    );
  }
  if (concurrency > requests) {
    throw new Error("--concurrency cannot exceed --requests.");
  }
  if (pageSize > 100) {
    throw new Error("--pageSize cannot exceed 100.");
  }

  return {
    programId,
    requests,
    warmupRequests,
    concurrency,
    pageSize,
    thresholdMs,
  };
}

function longestSearchToken(value: string): string {
  const token = value
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)[0];

  if (!token) {
    throw new Error(`Could not derive a search query from "${value}".`);
  }

  return token.slice(0, 12);
}

function emailInfix(email: string): string {
  const domain = email.split("@")[1];
  if (!domain) {
    return longestSearchToken(email);
  }

  const domainName = domain.split(".")[0];
  return domainName.slice(0, Math.min(5, domainName.length));
}

function createSearchCases(document: PartnerSearchDocument): SearchCase[] {
  const platformType = document.platformTypes[0];
  const platformIdentifier = document.platformIdentifiers[0];
  const linkDomain = document.linkDomains[0];
  const linkKey = document.linkKeys[0];
  const shortLink = document.shortLinks[0];
  const destinationUrl = document.destinationUrls[0];

  if (
    !document.email ||
    !document.companyName ||
    !document.description ||
    !platformType ||
    !platformIdentifier ||
    !linkDomain ||
    !linkKey ||
    !shortLink ||
    !destinationUrl
  ) {
    throw new Error(
      "The benchmark sample must have an email, company, description, platform, and link.",
    );
  }

  return [
    { field: "name", query: longestSearchToken(document.name) },
    { field: "email infix", query: emailInfix(document.email) },
    { field: "company", query: longestSearchToken(document.companyName) },
    { field: "description", query: longestSearchToken(document.description) },
    { field: "platform type", query: platformType },
    {
      field: "platform identifier",
      query: longestSearchToken(platformIdentifier),
    },
    { field: "link domain", query: longestSearchToken(linkDomain) },
    { field: "link key", query: longestSearchToken(linkKey) },
    { field: "short link", query: longestSearchToken(shortLink) },
    {
      field: "destination URL",
      query: longestSearchToken(destinationUrl),
    },
  ];
}

async function loadSearchCases(programId: string): Promise<SearchCase[]> {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      programId,
      partner: {
        email: { not: null },
        companyName: { not: null },
        description: { not: null },
        platforms: { some: {} },
      },
      links: { some: {} },
    },
    select: partnerSearchDocumentSelect,
  });

  if (!enrollment) {
    throw new Error(
      `No complete partner search document found for program ${programId}.`,
    );
  }

  return createSearchCases(serializePartnerSearchDocument(enrollment));
}

function percentile(values: number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

async function runWithConcurrency<T>(
  count: number,
  concurrency: number,
  operation: (index: number) => Promise<T>,
): Promise<T[]> {
  const results = new Array<T>(count);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < count) {
      const index = nextIndex++;
      results[index] = await operation(index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(count, concurrency) }, () => worker()),
  );

  return results;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const searchProvider = getPartnerSearchProvider();

  if (!searchProvider) {
    throw new Error(
      "Partner search provider is not configured. Implement and configure it before running the benchmark.",
    );
  }

  const partnerCount = await prisma.programEnrollment.count({
    where: { programId: options.programId },
  });
  if (partnerCount < MINIMUM_PARTNERS) {
    throw new Error(
      `Program ${options.programId} has ${partnerCount.toLocaleString()} partners. At least ${MINIMUM_PARTNERS.toLocaleString()} are required.`,
    );
  }

  const searchCases = await loadSearchCases(options.programId);

  const runSearch = async (index: number): Promise<BenchmarkResult> => {
    const searchCase = searchCases[index % searchCases.length];
    const filters = {
      programId: options.programId,
      search: searchCase.query,
      page: 1,
      pageSize: options.pageSize,
      sortBy: "totalSaleAmount" as const,
      sortOrder: "desc" as const,
    };
    const startedAt = performance.now();
    const [partners, count] = await Promise.all([
      getPartners(filters, { searchProvider }),
      getPartnersCount<number>(filters, { searchProvider }),
    ]);

    if (partners.length === 0 || count === 0) {
      throw new Error(
        `Search case "${searchCase.field}" returned no results for "${searchCase.query}".`,
      );
    }

    return {
      ...searchCase,
      latencyMs: performance.now() - startedAt,
    };
  };

  console.log(`Partner search benchmark for program ${options.programId}`);
  console.log(`${partnerCount.toLocaleString()} indexed partners`);
  console.log(
    `${options.requests.toLocaleString()} measured requests, ${options.warmupRequests.toLocaleString()} warm-up requests, concurrency ${options.concurrency}`,
  );
  console.log(
    `Each request runs the partner list and count paths in parallel across ${searchCases.length} search cases.`,
  );

  await runWithConcurrency(
    options.warmupRequests,
    options.concurrency,
    runSearch,
  );

  const startedAt = performance.now();
  const results = await runWithConcurrency(
    options.requests,
    options.concurrency,
    runSearch,
  );
  const elapsedMs = performance.now() - startedAt;
  const latencies = results.map(({ latencyMs }) => latencyMs);
  const mean =
    latencies.reduce((total, latency) => total + latency, 0) / latencies.length;
  const p99 = percentile(latencies, 0.99);
  const caseSummaries = searchCases.map(({ field, query }) => {
    const caseLatencies = results
      .filter((result) => result.field === field)
      .map(({ latencyMs }) => latencyMs);

    return {
      field,
      query,
      samples: caseLatencies.length,
      p50Ms: percentile(caseLatencies, 0.5),
      p95Ms: percentile(caseLatencies, 0.95),
      p99Ms: percentile(caseLatencies, 0.99),
      maxMs: Math.max(...caseLatencies),
    };
  });
  const slowestCase = caseSummaries.reduce((slowest, current) =>
    current.p99Ms > slowest.p99Ms ? current : slowest,
  );

  console.table(
    caseSummaries.map(({ field, query, samples, ...latency }) => ({
      field,
      query,
      samples,
      ...Object.fromEntries(
        Object.entries(latency).map(([key, value]) => [key, value.toFixed(1)]),
      ),
    })),
  );

  console.table({
    samples: latencies.length,
    meanMs: mean.toFixed(1),
    p50Ms: percentile(latencies, 0.5).toFixed(1),
    p95Ms: percentile(latencies, 0.95).toFixed(1),
    p99Ms: p99.toFixed(1),
    maxMs: Math.max(...latencies).toFixed(1),
    requestsPerSecond: ((options.requests * 1_000) / elapsedMs).toFixed(1),
  });

  if (slowestCase.p99Ms >= options.thresholdMs) {
    throw new Error(
      `${slowestCase.field} p99 latency ${slowestCase.p99Ms.toFixed(1)}ms did not meet the <${options.thresholdMs}ms threshold.`,
    );
  }

  console.log(
    `Passed: every search case has p99 latency below ${options.thresholdMs}ms.`,
  );
}

main()
  .catch((error) => {
    console.error("Partner search benchmark failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
