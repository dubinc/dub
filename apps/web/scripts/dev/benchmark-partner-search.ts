/**
 * Measures p99 latency of the relevance-ranked partner list for a program.
 *
 * Calls `getPartners` in process, not over HTTP, so the numbers exclude route
 * handling, auth, and serialization — treat them as a floor for the endpoint.
 *
 * To avoid measuring a warm cache it samples `--sampleSize` partners strided
 * across the program and exhausts a field's queries before repeating any. Fields
 * whose values barely vary still collapse to a few queries, so each field's
 * distinct-query count is reported and undersized pools are flagged; a p99 under
 * that warning is optimistic.
 *
 * Exits non-zero when a field produced no successful request, when the error rate
 * exceeds `--maxErrorRate`, or when a p99 reaches `--thresholdMs`.
 *
 *   cd apps/web
 *   pnpm run script dev/benchmark-partner-search --programId=prog_123 [--requests=1000]
 *     [--sampleSize=100] [--concurrency=10] [--warmup=50] [--thresholdMs=1000]
 *
 * Requires PARTNER_SEARCH_PROVIDER and an index backfilled for the program:
 *   pnpm run script partners/backfill-partner-search --programId=prog_123
 */

import { getPartners } from "@/lib/api/partners/get-partners";
import {
  getPartnerSearchProvider,
  getPartnerSearchProviderName,
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
  type PartnerSearchDocument,
} from "@/lib/api/partners/search";
import { prisma } from "@/lib/prisma";
import {
  parseNonNegativeInteger,
  parsePositiveInteger,
} from "@/scripts/utils/parse-cli-number";
import "dotenv-flow/config";

const DEFAULT_REQUESTS = 1_000;
const DEFAULT_WARMUP_REQUESTS = 50;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_THRESHOLD_MS = 1_000;
const MINIMUM_REQUESTS = 1_000;
const DEFAULT_SAMPLE_SIZE = 100;
const MAX_SAMPLE_SIZE = 1_000;
const DEFAULT_MAX_ERROR_RATE = 0;

interface BenchmarkArguments {
  programId: string;
  requests: number;
  warmupRequests: number;
  concurrency: number;
  pageSize: number;
  thresholdMs: number;
  sampleSize: number;
  maxErrorRate: number;
}

interface SearchCase {
  field: string;
  query: string;
}

interface SearchCasePool {
  field: string;
  queries: string[];
}

interface BenchmarkResult {
  field: string;
  query: string;
  latencyMs: number;
  error: string | null;
}

function parsePercentage(value: string, flag: string): number {
  const parsed = /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;

  if (!Number.isFinite(parsed) || parsed > 100) {
    throw new Error(`${flag} must be between 0 and 100, received: "${value}"`);
  }

  return parsed;
}

function parseArguments(args: string[]): BenchmarkArguments {
  let programId: string | undefined;
  let requests = DEFAULT_REQUESTS;
  let warmupRequests = DEFAULT_WARMUP_REQUESTS;
  let concurrency = DEFAULT_CONCURRENCY;
  let pageSize = DEFAULT_PAGE_SIZE;
  let thresholdMs = DEFAULT_THRESHOLD_MS;
  let sampleSize = DEFAULT_SAMPLE_SIZE;
  let maxErrorRate = DEFAULT_MAX_ERROR_RATE;

  for (const arg of args) {
    if (arg.startsWith("--programId=")) {
      programId = arg.slice("--programId=".length);
    } else if (arg.startsWith("--requests=")) {
      requests = parsePositiveInteger(
        arg.slice("--requests=".length),
        "--requests",
      );
    } else if (arg.startsWith("--warmup=")) {
      warmupRequests = parseNonNegativeInteger(
        arg.slice("--warmup=".length),
        "--warmup",
      );
    } else if (arg.startsWith("--sampleSize=")) {
      sampleSize = parsePositiveInteger(
        arg.slice("--sampleSize=".length),
        "--sampleSize",
      );
    } else if (arg.startsWith("--maxErrorRate=")) {
      maxErrorRate = parsePercentage(
        arg.slice("--maxErrorRate=".length),
        "--maxErrorRate",
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
  if (pageSize > PARTNER_SEARCH_CANDIDATE_LIMIT) {
    throw new Error(
      `--pageSize cannot exceed ${PARTNER_SEARCH_CANDIDATE_LIMIT}.`,
    );
  }
  if (sampleSize > MAX_SAMPLE_SIZE) {
    throw new Error(`--sampleSize cannot exceed ${MAX_SAMPLE_SIZE}.`);
  }

  return {
    programId,
    requests,
    warmupRequests,
    concurrency,
    pageSize,
    thresholdMs,
    sampleSize,
    maxErrorRate,
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

async function loadSearchCasePools(
  programId: string,
  sampleSize: number,
  partnerCount: number,
): Promise<SearchCasePool[]> {
  const stride = Math.max(1, Math.floor(partnerCount / sampleSize));
  const enrollments = await prisma.programEnrollment.findMany({
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
    orderBy: { id: "asc" },
    take: sampleSize * stride,
  });

  const sampled = enrollments.filter((_, index) => index % stride === 0);

  if (sampled.length === 0) {
    throw new Error(
      `No complete partner search document found for program ${programId}.`,
    );
  }

  const queriesByField = new Map<string, Set<string>>();

  for (const enrollment of sampled) {
    const document = serializePartnerSearchDocument(enrollment);

    for (const { field, query } of createSearchCases(document)) {
      const queries = queriesByField.get(field) ?? new Set<string>();
      queries.add(query);
      queriesByField.set(field, queries);
    }
  }

  return Array.from(queriesByField, ([field, queries]) => ({
    field,
    queries: Array.from(queries),
  }));
}

function reportOverlappingPools(pools: SearchCasePool[]) {
  const fieldsByQuerySet = new Map<string, string[]>();

  for (const { field, queries } of pools) {
    const key = JSON.stringify(queries);
    fieldsByQuerySet.set(key, [...(fieldsByQuerySet.get(key) ?? []), field]);
  }

  for (const fields of fieldsByQuerySet.values()) {
    if (fields.length > 1) {
      console.warn(
        `⚠️  These fields resolve to identical queries and measure the same work: ${fields.join(", ")}.`,
      );
    }
  }
}

function reportRepeatedQueries(pools: SearchCasePool[], requests: number) {
  const requestsPerField = Math.ceil(requests / pools.length);

  for (const { field, queries } of pools) {
    if (queries.length < requestsPerField) {
      console.warn(
        `⚠️  "${field}" has only ${queries.length.toLocaleString()} distinct ${queries.length === 1 ? "query" : "queries"} for ${requestsPerField.toLocaleString()} requests, so each repeats ~${Math.round(requestsPerField / queries.length)}x and is likely served warm.`,
      );
    }
  }
}

function percentile(values: number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

function formatLatency(value: number | null): string {
  return value === null ? "n/a" : value.toFixed(1);
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
  const providerName = getPartnerSearchProviderName();

  if (!searchProvider) {
    throw new Error(
      "Partner search provider is not configured. Implement and configure it before running the benchmark.",
    );
  }

  const partnerCount = await prisma.programEnrollment.count({
    where: { programId: options.programId },
  });
  if (partnerCount === 0) {
    throw new Error(`Program ${options.programId} has 0 partners.`);
  }

  const pools = await loadSearchCasePools(
    options.programId,
    options.sampleSize,
    partnerCount,
  );

  const runSearch = async (index: number): Promise<BenchmarkResult> => {
    // Rotate fields on every request and advance that field's query once per
    // full rotation, so consecutive requests never repeat a query until the
    // pool is exhausted. Deterministic, so two runs issue the same work.
    const pool = pools[index % pools.length];
    const query =
      pool.queries[Math.floor(index / pools.length) % pool.queries.length];
    const searchCase: SearchCase = { field: pool.field, query };
    const filters = {
      programId: options.programId,
      search: searchCase.query,
      page: 1,
      pageSize: options.pageSize,
      sortBy: "relevance" as const,
      sortOrder: "desc" as const,
    };
    const startedAt = performance.now();

    try {
      const partners = await getPartners(filters, { searchProvider });

      if (partners.length === 0) {
        throw new Error(
          `Search case "${searchCase.field}" returned no results for "${searchCase.query}".`,
        );
      }

      return {
        ...searchCase,
        latencyMs: performance.now() - startedAt,
        error: null,
      };
    } catch (error) {
      return {
        ...searchCase,
        latencyMs: performance.now() - startedAt,
        error: getErrorMessage(error),
      };
    }
  };

  console.log(`Partner search benchmark for program ${options.programId}`);
  console.log(`Provider: ${providerName}`);
  console.log(`${partnerCount.toLocaleString()} program partners`);
  console.log(
    `${options.requests.toLocaleString()} measured requests, ${options.warmupRequests.toLocaleString()} warm-up requests, concurrency ${options.concurrency}`,
  );
  const distinctQueries = pools.reduce(
    (total, { queries }) => total + queries.length,
    0,
  );
  console.log(
    `Each request runs the relevance-ranked partner list path across ${pools.length} search cases, drawing from ${distinctQueries.toLocaleString()} distinct queries sampled from ${options.sampleSize.toLocaleString()} partners.`,
  );
  reportOverlappingPools(pools);
  reportRepeatedQueries(pools, options.requests);

  const warmupResults = await runWithConcurrency(
    options.warmupRequests,
    options.concurrency,
    runSearch,
  );
  const warmupErrorCount = warmupResults.filter(({ error }) => error).length;
  if (warmupErrorCount > 0) {
    console.warn(
      `${warmupErrorCount.toLocaleString()} of ${options.warmupRequests.toLocaleString()} warm-up requests failed. Continuing to collect measured results.`,
    );
  }

  const startedAt = performance.now();
  const results = await runWithConcurrency(
    options.requests,
    options.concurrency,
    // Continue past the warm-up indices so the measured run does not reissue the
    // queries the warm-up just cached.
    (index) => runSearch(options.warmupRequests + index),
  );
  const elapsedMs = performance.now() - startedAt;
  const successfulResults = results.filter(({ error }) => error === null);
  const failedResults = results.filter(({ error }) => error !== null);
  const latencies = successfulResults.map(({ latencyMs }) => latencyMs);
  const mean =
    latencies.length > 0
      ? latencies.reduce((total, latency) => total + latency, 0) /
        latencies.length
      : null;
  const p99 = latencies.length > 0 ? percentile(latencies, 0.99) : null;
  const caseSummaries = pools.map(({ field, queries }) => {
    const query = `${queries[0]}${queries.length > 1 ? ` (+${queries.length - 1})` : ""}`;
    const caseResults = results.filter((result) => result.field === field);
    const caseErrors = caseResults.filter(({ error }) => error !== null).length;
    const caseLatencies = caseResults
      .filter(({ error }) => error === null)
      .map(({ latencyMs }) => latencyMs);

    return {
      field,
      query,
      samples: caseResults.length,
      errors: caseErrors,
      errorRate:
        caseResults.length > 0 ? (caseErrors / caseResults.length) * 100 : 0,
      p50Ms: caseLatencies.length > 0 ? percentile(caseLatencies, 0.5) : null,
      p95Ms: caseLatencies.length > 0 ? percentile(caseLatencies, 0.95) : null,
      p99Ms: caseLatencies.length > 0 ? percentile(caseLatencies, 0.99) : null,
      maxMs: caseLatencies.length > 0 ? Math.max(...caseLatencies) : null,
    };
  });
  const casesWithLatency = caseSummaries.filter(
    (summary): summary is typeof summary & { p99Ms: number } =>
      summary.p99Ms !== null,
  );
  const slowestCase = casesWithLatency.reduce<
    (typeof casesWithLatency)[number] | null
  >(
    (slowest, current) =>
      !slowest || current.p99Ms > slowest.p99Ms ? current : slowest,
    null,
  );

  console.table(
    caseSummaries.map(
      ({ field, query, samples, errors, errorRate, ...latency }) => ({
        field,
        query,
        samples,
        errors,
        errorRate: `${errorRate.toFixed(2)}%`,
        ...Object.fromEntries(
          Object.entries(latency).map(([key, value]) => [
            key,
            formatLatency(value),
          ]),
        ),
      }),
    ),
  );

  if (failedResults.length > 0) {
    const errorCounts = new Map<string, number>();
    for (const { error } of failedResults) {
      errorCounts.set(error!, (errorCounts.get(error!) ?? 0) + 1);
    }
    console.table(
      Array.from(errorCounts, ([error, count]) => ({ error, count })),
    );
  }

  console.table({
    samples: results.length,
    successful: successfulResults.length,
    errors: failedResults.length,
    errorRate: `${((failedResults.length / results.length) * 100).toFixed(2)}%`,
    meanMs: formatLatency(mean),
    p50Ms: formatLatency(
      latencies.length > 0 ? percentile(latencies, 0.5) : null,
    ),
    p95Ms: formatLatency(
      latencies.length > 0 ? percentile(latencies, 0.95) : null,
    ),
    p99Ms: formatLatency(p99),
    maxMs: formatLatency(latencies.length > 0 ? Math.max(...latencies) : null),
    requestsPerSecond: ((options.requests * 1_000) / elapsedMs).toFixed(1),
  });

  const casesWithoutSamples = caseSummaries.filter(
    ({ p99Ms }) => p99Ms === null,
  );
  if (casesWithoutSamples.length > 0) {
    throw new Error(
      `No successful requests for: ${casesWithoutSamples
        .map(({ field }) => field)
        .join(
          ", ",
        )}. There is no p99 to compare against the threshold — check that the search index is backfilled for this program.`,
    );
  }

  const errorRate = (failedResults.length / results.length) * 100;
  if (errorRate > options.maxErrorRate) {
    throw new Error(
      `${failedResults.length.toLocaleString()} of ${results.length.toLocaleString()} measured requests failed (${errorRate.toFixed(2)}% error rate, --maxErrorRate=${options.maxErrorRate}).`,
    );
  }

  if (slowestCase && slowestCase.p99Ms >= options.thresholdMs) {
    throw new Error(
      `${slowestCase.field} p99 latency ${slowestCase.p99Ms.toFixed(1)}ms did not meet the <${options.thresholdMs}ms threshold.`,
    );
  }

  console.log(
    `Completed: every search case has p99 latency below ${options.thresholdMs}ms${failedResults.length > 0 ? `, with a ${errorRate.toFixed(2)}% error rate within the --maxErrorRate=${options.maxErrorRate} allowance` : ""}.`,
  );
}

main()
  .catch((error) => {
    console.error("Partner search benchmark failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
