import {
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  parseBackfillArguments,
} from "@/scripts/partners/backfill-partner-search-args";
import { describe, expect, it } from "vitest";

describe("parseBackfillArguments", () => {
  it("refuses to run bare, so a full backfill cannot start by accident", () => {
    expect(() => parseBackfillArguments([])).toThrow(
      "Pass --programId=<id> for one program, or --all for every program.",
    );
  });

  it("takes a single program", () => {
    expect(parseBackfillArguments(["--programId=prog_1"])).toEqual({
      programId: "prog_1",
      all: false,
      batchSize: DEFAULT_BATCH_SIZE,
      after: undefined,
      afterProgram: undefined,
    });
  });

  it("takes every program behind an explicit flag", () => {
    expect(parseBackfillArguments(["--all"])).toEqual({
      programId: undefined,
      all: true,
      batchSize: DEFAULT_BATCH_SIZE,
      after: undefined,
      afterProgram: undefined,
    });
  });

  it("rejects one program and every program together", () => {
    expect(() =>
      parseBackfillArguments(["--programId=prog_1", "--all"]),
    ).toThrow("--programId and --all are mutually exclusive.");
  });

  it("resumes a single-program run from an enrollment", () => {
    expect(
      parseBackfillArguments(["--programId=prog_1", "--after=pge_9"]),
    ).toMatchObject({
      programId: "prog_1",
      after: "pge_9",
    });
  });

  it("resumes an --all run from both halves of the cursor", () => {
    expect(
      parseBackfillArguments([
        "--all",
        "--afterProgram=prog_5",
        "--after=pge_9",
      ]),
    ).toMatchObject({
      all: true,
      afterProgram: "prog_5",
      after: "pge_9",
    });
  });

  it("rejects an enrollment cursor with no program on an --all run", () => {
    expect(() => parseBackfillArguments(["--all", "--after=pge_9"])).toThrow(
      "--after requires --afterProgram on an --all run.",
    );
  });

  it("rejects a program cursor on a single-program run", () => {
    expect(() =>
      parseBackfillArguments(["--programId=prog_1", "--afterProgram=prog_5"]),
    ).toThrow("--afterProgram only applies to --all runs.");
  });

  it("rejects empty cursors, which would silently mean no cursor", () => {
    expect(() => parseBackfillArguments(["--all", "--afterProgram="])).toThrow(
      "--afterProgram cannot be empty.",
    );
    expect(() =>
      parseBackfillArguments(["--programId=prog_1", "--after="]),
    ).toThrow("--after cannot be empty.");
    expect(() => parseBackfillArguments(["--programId="])).toThrow(
      "Pass --programId=<id> for one program, or --all for every program.",
    );
  });

  it("caps the batch size", () => {
    expect(
      parseBackfillArguments(["--all", `--batchSize=${MAX_BATCH_SIZE}`]),
    ).toMatchObject({ batchSize: MAX_BATCH_SIZE });

    expect(() =>
      parseBackfillArguments(["--all", `--batchSize=${MAX_BATCH_SIZE + 1}`]),
    ).toThrow(`--batchSize cannot exceed ${MAX_BATCH_SIZE}.`);
  });

  it("rejects an unknown argument rather than ignoring it", () => {
    expect(() => parseBackfillArguments(["--all", "--dryRun"])).toThrow(
      "Unknown argument: --dryRun",
    );
  });
});
