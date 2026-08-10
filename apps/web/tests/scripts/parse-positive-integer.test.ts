import { parsePositiveInteger } from "@/scripts/utils/parse-positive-integer";
import { describe, expect, it } from "vitest";

describe("parsePositiveInteger", () => {
  it("parses plain digit strings", () => {
    expect(parsePositiveInteger("1", "--count")).toBe(1);
    expect(parsePositiveInteger("100000", "--count")).toBe(100_000);
    expect(parsePositiveInteger("007", "--count")).toBe(7);
  });

  it.each([
    ["0x10", "hex"],
    ["1e9", "scientific notation"],
    ["5.0", "decimal"],
    ["+5", "explicit sign"],
    [" 5 ", "surrounding whitespace"],
    ["Infinity", "infinity"],
    ["9007199254740992", "above Number.MAX_SAFE_INTEGER"],
  ])("rejects %s (%s)", (value) => {
    expect(() => parsePositiveInteger(value, "--count")).toThrow(
      "--count must be a positive integer",
    );
  });

  it.each([["0"], ["-1"], [""], ["abc"]])("rejects %j", (value) => {
    expect(() => parsePositiveInteger(value, "--count")).toThrow(
      "--count must be a positive integer",
    );
  });

  it("reports the offending value and the flag name", () => {
    expect(() => parsePositiveInteger("1e9", "--requests")).toThrow(
      '--requests must be a positive integer, received: "1e9"',
    );
    expect(() => parsePositiveInteger(undefined, "--requests")).toThrow(
      "--requests must be a positive integer, received: (missing)",
    );
  });
});
