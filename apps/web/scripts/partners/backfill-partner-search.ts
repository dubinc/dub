/**
 * Indexes a program's partner enrollments into the configured search provider.
 *
 * Pages by enrollment ID rather than offset, so per-batch cost stays flat across
 * a 100K-partner program. A failed run prints the command to resume from the
 * last indexed document, so a partial backfill is never redone from zero.
 *
 * The backfill only upserts, so it cannot remove documents whose enrollment was
 * deleted. --reconcile sweeps up those orphans afterwards — note that sweep
 * covers the entire index, not only --programId.
 *
 *   cd apps/web
 *   pnpm run script partners/backfill-partner-search --programId=prog_123
 *     [--batchSize=500] [--after=pge_123] [--reconcile]
 *
 * Requires PARTNER_SEARCH_PROVIDER to be configured.
 */

import {
  backfillPartnerSearch,
  getPartnerSearchProviderName,
  reconcilePartnerSearchIndex,
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
  reconcile: boolean;
}

function parseArguments(args: string[]): BackfillArguments {
  let programId: string | undefined;
  let batchSize = DEFAULT_BATCH_SIZE;
  let after: string | undefined;
  let reconcile = false;

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
    } else if (arg === "--reconcile") {
      reconcile = true;
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

  return { programId, batchSize, after, reconcile };
}

let resumeAfter: string | undefined;

function reportProgress({
  batchSize,
  processed,
  lastDocumentId,
}: PartnerSearchBackfillProgress) {
  resumeAfter = lastDocumentId;
  console.log(
    `Indexed ${processed.toLocaleString()} documents (${batchSize.toLocaleString()} in this batch), last document: ${lastDocumentId}`,
  );
}

async function main() {
  const { programId, batchSize, after, reconcile } = parseArguments(
    process.argv.slice(2),
  );
  resumeAfter = after;
  const providerName = getPartnerSearchProviderName();
  if (!providerName) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  // Redis Search indexes have an explicit schema and must exist before the
  // backfill starts. Upstash Search creates its index on the first upsert.
  if (providerName === "upstash-redis") {
    await createUpstashRedisPartnerSearchIndex();
  }

  console.log(`Starting partner search backfill for program ${programId}`);
  console.log(`Provider: ${providerName}`);
  console.log(
    `Batch size: ${batchSize.toLocaleString()}${after ? `, resuming after ${after}` : ""}`,
  );

  const result = await backfillPartnerSearch({
    programId,
    batchSize,
    after,
    onProgress: reportProgress,
  });

  console.log(
    `Partner search backfill complete: ${result.processed.toLocaleString()} documents indexed.`,
  );
  if (result.lastDocumentId) {
    console.log(`Last document: ${result.lastDocumentId}`);
  }

  if (!reconcile) {
    return;
  }

  // Index-wide because neither provider can enumerate documents by program.
  console.log("Reconciling the index against the database (all programs)...");

  const { scanned, deleted } = await reconcilePartnerSearchIndex({
    onProgress: ({ scanned, deleted }) => {
      if (scanned > 0 && scanned % 10_000 === 0) {
        console.log(
          `Scanned ${scanned.toLocaleString()} documents, removed ${deleted.toLocaleString()} orphans`,
        );
      }
    },
  });

  console.log(
    `Reconcile complete: scanned ${scanned.toLocaleString()} documents, removed ${deleted.toLocaleString()} orphans.`,
  );
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
