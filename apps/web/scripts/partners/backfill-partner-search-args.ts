import { parsePositiveInteger } from "@/scripts/utils/parse-cli-number";

export const DEFAULT_BATCH_SIZE = 500;
export const MAX_BATCH_SIZE = 1_000;

export interface BackfillArguments {
  programId?: string;
  all: boolean;
  batchSize: number;
  after?: string;
  afterProgram?: string;
}

/**
 * Kept out of the script itself so the guardrails can be tested without the
 * module executing a backfill on import.
 */
export function parseBackfillArguments(args: string[]): BackfillArguments {
  let programId: string | undefined;
  let all = false;
  let batchSize = DEFAULT_BATCH_SIZE;
  let after: string | undefined;
  let afterProgram: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--programId=")) {
      programId = arg.slice("--programId=".length);
    } else if (arg === "--all") {
      all = true;
    } else if (arg.startsWith("--batchSize=")) {
      batchSize = parsePositiveInteger(
        arg.slice("--batchSize=".length),
        "--batchSize",
      );
    } else if (arg.startsWith("--after=")) {
      after = arg.slice("--after=".length);
    } else if (arg.startsWith("--afterProgram=")) {
      afterProgram = arg.slice("--afterProgram=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  // Indexing every program is ~1.6M writes against whichever namespace the
  // configured key points at, so it has to be asked for rather than defaulted
  // into by running the script bare.
  if (!programId && !all) {
    throw new Error(
      "Pass --programId=<id> for one program, or --all for every program.",
    );
  }

  if (programId && all) {
    throw new Error("--programId and --all are mutually exclusive.");
  }

  if (programId === "") {
    throw new Error("--programId cannot be empty.");
  }

  if (batchSize > MAX_BATCH_SIZE) {
    throw new Error(`--batchSize cannot exceed ${MAX_BATCH_SIZE}.`);
  }

  if (after === "") {
    throw new Error("--after cannot be empty.");
  }

  if (afterProgram === "") {
    throw new Error("--afterProgram cannot be empty.");
  }

  if (afterProgram && !all) {
    throw new Error("--afterProgram only applies to --all runs.");
  }

  // Without the program it belongs to, an enrollment cursor says nothing about
  // where an --all run stopped.
  if (all && after && !afterProgram) {
    throw new Error("--after requires --afterProgram on an --all run.");
  }

  return { programId, all, batchSize, after, afterProgram };
}
