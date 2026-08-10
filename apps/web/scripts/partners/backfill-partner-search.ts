import {
  backfillPartnerSearch,
  createUpstashRedisPartnerSearchIndex,
  getPartnerSearchProviderName,
  reconcilePartnerSearchIndex,
  type PartnerSearchBackfillProgress,
} from "@/lib/api/partners/search";
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

  // The backfill above only upserts, so it cannot remove documents for
  // enrollments that were deleted. This sweep covers the whole index, not just
  // --programId, because neither provider can enumerate documents by program.
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
