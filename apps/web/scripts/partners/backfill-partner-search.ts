/**
 * Indexes partner enrollments into the configured search provider.
 *
 * Runs one program or every program. Pages by enrollment ID rather than offset,
 * so per-batch cost stays flat across a 100K-partner program, and iterates
 * programs in ID order so a resumed run picks up exactly where it stopped.
 *
 * Programs are the outer loop rather than one cursor over the whole table. A
 * single global cursor would be simpler, but it leaves every program partially
 * indexed until the entire run finishes, so no program is ever in a state worth
 * trusting. Per-program means each finished program is genuinely done.
 *
 * The backfill only upserts. Documents whose enrollment was deleted are removed
 * by rebuilding the index wholesale, not incrementally: delete it and backfill
 * again.
 *
 *   cd apps/web
 *   pnpm run script partners/backfill-partner-search --programId=prog_123
 *     [--batchSize=500] [--after=pge_123]
 *
 *   pnpm run script partners/backfill-partner-search --all
 *     [--batchSize=500] [--afterProgram=prog_123 --after=pge_123]
 *
 * Requires TURBOPUFFER_API_KEY to be configured.
 */

import {
  backfillPartnerSearch,
  getPartnerSearchProvider,
  type PartnerSearchBackfillProgress,
} from "@/lib/api/partners/search";
import { prisma } from "@/lib/prisma";
import { parseBackfillArguments } from "@/scripts/partners/backfill-partner-search-args";
import "dotenv-flow/config";

const PROGRAM_PAGE_SIZE = 1_000;

/**
 * Every program ID in ID order, paged so a large account does not load them all
 * in one query. Starts at `afterProgram` inclusive, because that program is the
 * one a resumed run left partway through.
 */
async function* iterateProgramIds(afterProgram?: string) {
  let cursor = afterProgram;
  let inclusive = Boolean(afterProgram);

  while (true) {
    const programs = await prisma.program.findMany({
      where: cursor ? { id: inclusive ? { gte: cursor } : { gt: cursor } } : {},
      select: { id: true },
      orderBy: { id: "asc" },
      take: PROGRAM_PAGE_SIZE,
    });

    if (programs.length === 0) {
      return;
    }

    for (const { id } of programs) {
      yield id;
    }

    cursor = programs[programs.length - 1].id;
    inclusive = false;

    if (programs.length < PROGRAM_PAGE_SIZE) {
      return;
    }
  }
}

// Tracks where to resume from, so a failure can print a command that skips
// everything already indexed rather than starting the run over.
const resumeState: { programId?: string; after?: string } = {};

function createProgressReporter({
  programId,
  totalDocuments,
  batchSize,
  label,
}: {
  programId: string;
  totalDocuments: number | null;
  batchSize: number;
  label: string;
}) {
  const totalChunks =
    totalDocuments === null
      ? null
      : Math.max(1, Math.ceil(totalDocuments / batchSize));
  const startTime = Date.now();
  let chunk = 0;

  return ({ processed, lastDocumentId }: PartnerSearchBackfillProgress) => {
    resumeState.programId = programId;
    resumeState.after = lastDocumentId;
    chunk += 1;

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

    // `totalDocuments` is a snapshot from before the run, so enrollments
    // written while it pages can push the final chunk past it; the percentage
    // is clamped rather than reporting >100%.
    const progress =
      totalDocuments === null
        ? `chunk ${chunk}`
        : `chunk ${chunk}/${totalChunks} (${Math.min(
            100,
            totalDocuments > 0 ? (processed / totalDocuments) * 100 : 100,
          ).toFixed(0)}%)`;

    console.log(
      `${label} ${progress}: ${processed.toLocaleString()} indexed, through ${lastDocumentId} (${elapsedSec}s)`,
    );
  };
}

async function backfillProgram({
  programId,
  batchSize,
  after,
  label,
  countDocuments,
}: {
  programId: string;
  batchSize: number;
  after?: string;
  label: string;
  countDocuments: boolean;
}) {
  // Skipped on --all runs: a count per program doubles the query count across
  // thousands of programs to buy a percentage nobody is watching that closely.
  const totalDocuments = countDocuments
    ? await prisma.programEnrollment.count({
        where: {
          programId,
          ...(after && { id: { gt: after } }),
        },
      })
    : null;

  if (totalDocuments !== null) {
    console.log(`${totalDocuments.toLocaleString()} enrollments to index\n`);
  }

  const { processed } = await backfillPartnerSearch({
    programId,
    batchSize,
    after,
    onProgress: createProgressReporter({
      programId,
      totalDocuments,
      batchSize,
      label,
    }),
  });

  return processed;
}

async function main() {
  const { programId, all, batchSize, after, afterProgram } =
    parseBackfillArguments(process.argv.slice(2));

  if (!getPartnerSearchProvider()) {
    throw new Error("TURBOPUFFER_API_KEY is not configured.");
  }

  const startTime = Date.now();

  if (programId) {
    resumeState.programId = programId;
    resumeState.after = after;

    console.log(`Starting partner search backfill for program ${programId}`);
    console.log(
      `Batch size: ${batchSize.toLocaleString()}${after ? `, resuming after ${after}` : ""}`,
    );

    const processed = await backfillProgram({
      programId,
      batchSize,
      after,
      label: `  [${programId}]`,
      countDocuments: true,
    });

    console.log(
      `\nPartner search backfill complete: ${processed.toLocaleString()} documents indexed.`,
    );

    return;
  }

  console.log("Starting partner search backfill for every program");
  console.log(
    `Batch size: ${batchSize.toLocaleString()}${
      afterProgram
        ? `, resuming at program ${afterProgram}${after ? ` after ${after}` : ""}`
        : ""
    }\n`,
  );

  let programCount = 0;
  let totalProcessed = 0;

  for await (const currentProgramId of iterateProgramIds(afterProgram)) {
    programCount += 1;

    // The enrollment cursor belongs to the program the run stopped inside, so
    // it applies to that one only. Every program after it starts from scratch.
    const programAfter = currentProgramId === afterProgram ? after : undefined;

    resumeState.programId = currentProgramId;
    resumeState.after = programAfter;

    const processed = await backfillProgram({
      programId: currentProgramId,
      batchSize,
      after: programAfter,
      label: `  [${programCount}] ${currentProgramId}`,
      countDocuments: false,
    });

    totalProcessed += processed;

    console.log(
      `[${programCount}] ${currentProgramId}: ${processed.toLocaleString()} indexed (${totalProcessed.toLocaleString()} total)`,
    );
  }

  const elapsedMin = ((Date.now() - startTime) / 60_000).toFixed(1);
  console.log(
    `\nPartner search backfill complete: ${totalProcessed.toLocaleString()} documents across ${programCount.toLocaleString()} programs in ${elapsedMin} minutes.`,
  );
}

main()
  .catch((error) => {
    console.error("Partner search backfill failed:", error);

    if (resumeState.programId) {
      const args = process.argv
        .slice(2)
        .filter(
          (arg) =>
            !arg.startsWith("--after=") && !arg.startsWith("--afterProgram="),
        );

      // An --all run needs both halves of the cursor. A single-program run
      // already names its program, so it only needs the enrollment.
      const resumeArgs = args.includes("--all")
        ? [
            ...args,
            `--afterProgram=${resumeState.programId}`,
            ...(resumeState.after ? [`--after=${resumeState.after}`] : []),
          ]
        : [...args, ...(resumeState.after ? [`--after=${resumeState.after}`] : [])];

      console.error(
        `Resume with:\n  pnpm run script partners/backfill-partner-search ${resumeArgs.join(" ")}`,
      );
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
