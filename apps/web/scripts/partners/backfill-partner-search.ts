/**
 * Indexes a program's partner enrollments into the configured search provider.
 *
 * Pages by enrollment ID rather than offset, so per-batch cost stays flat across
 * a 100K-partner program. A failed run prints the command to resume from the
 * last indexed document, so a partial backfill is never redone from zero.
 *
 * The backfill only upserts. Documents whose enrollment was deleted are removed
 * by rebuilding the index wholesale, not incrementally — delete it and backfill
 * again.
 *
 *   cd apps/web
 *   pnpm run script partners/backfill-partner-search --programId=prog_123
 *     [--batchSize=500] [--after=pge_123]
 *
 * Requires PARTNER_SEARCH_PROVIDER to be configured.
 */

import {
  backfillPartnerSearch,
  getPartnerSearchProviderName,
  type PartnerSearchBackfillProgress,
} from "@/lib/api/partners/search";
import { createUpstashRedisPartnerSearchIndex } from "@/lib/api/partners/search/providers/upstash-redis";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-cli-number";
import "dotenv-flow/config";

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1_000;

interface BackfillArguments {
  programId: string;
  batchSize: number;
  after?: string;
}

function parseArguments(args: string[]): BackfillArguments {
  let programId: string | undefined;
  let batchSize = DEFAULT_BATCH_SIZE;
  let after: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--programId=")) {
      programId = arg.slice("--programId=".length);
    } else if (arg.startsWith("--batchSize=")) {
      batchSize = parsePositiveInteger(
        arg.slice("--batchSize=".length),
        "--batchSize",
      );
    } else if (arg.startsWith("--after=")) {
      after = arg.slice("--after=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!programId) {
    throw new Error("--programId is required.");
  }

  if (batchSize > MAX_BATCH_SIZE) {
    throw new Error(`--batchSize cannot exceed ${MAX_BATCH_SIZE}.`);
  }

  if (after === "") {
    throw new Error("--after cannot be empty.");
  }

  return { programId, batchSize, after };
}

let resumeAfter: string | undefined;

// `totalDocuments` is a snapshot from before the run, so enrollments written
// while the backfill is paging can push the final chunk past it; the percentage
// is clamped rather than reporting >100%.
function createProgressReporter(totalDocuments: number, batchSize: number) {
  const totalChunks = Math.max(1, Math.ceil(totalDocuments / batchSize));
  const startTime = Date.now();
  let chunk = 0;

  return ({
    batchSize: indexedInChunk,
    processed,
    lastDocumentId,
  }: PartnerSearchBackfillProgress) => {
    resumeAfter = lastDocumentId;
    chunk += 1;

    const progressPct = Math.min(
      100,
      totalDocuments > 0 ? (processed / totalDocuments) * 100 : 100,
    ).toFixed(0);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[Chunk ${chunk}/${totalChunks}] (${progressPct}%) Processed ${processed.toLocaleString()}/${totalDocuments.toLocaleString()} partners (${indexedInChunk.toLocaleString()} indexed, through ${lastDocumentId})... (${elapsedSec}s elapsed)`,
    );
  };
}

async function main() {
  const { programId, batchSize, after } = parseArguments(process.argv.slice(2));
  resumeAfter = after;
  const providerName = getPartnerSearchProviderName();
  if (!providerName) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  // Redis Search indexes have an explicit schema and must exist before the
  // backfill starts. Turbopuffer creates its namespace on the first upsert.
  if (providerName === "upstash-redis") {
    await createUpstashRedisPartnerSearchIndex();
  }

  // Same where-clause the backfill pages with, so chunk totals line up.
  const totalDocuments = await prisma.programEnrollment.count({
    where: {
      programId,
      ...(after && { id: { gt: after } }),
    },
  });

  console.log(`Starting partner search backfill for program ${programId}`);
  console.log(`Provider: ${providerName}`);
  console.log(
    `Batch size: ${batchSize.toLocaleString()}${after ? `, resuming after ${after}` : ""}`,
  );
  console.log(`${totalDocuments.toLocaleString()} enrollments to index\n`);

  const result = await backfillPartnerSearch({
    programId,
    batchSize,
    after,
    onProgress: createProgressReporter(totalDocuments, batchSize),
  });

  console.log(
    `Partner search backfill complete: ${result.processed.toLocaleString()} documents indexed.`,
  );
  if (result.lastDocumentId) {
    console.log(`Last document: ${result.lastDocumentId}`);
  }
}

main()
  .catch((error) => {
    console.error("Partner search backfill failed:", error);

    if (resumeAfter) {
      const args = process.argv
        .slice(2)
        .filter((arg) => !arg.startsWith("--after="))
        .join(" ");
      console.error(
        `Documents up to ${resumeAfter} are indexed. Resume with:\n  pnpm run script partners/backfill-partner-search ${args} --after=${resumeAfter}`,
      );
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
