import {
  JEV_MATCH_THRESHOLD,
  isConfidentMatch,
} from "@/lib/ai/evaluate-partner-application";
import { describe, expect, it } from "vitest";

describe("isConfidentMatch", () => {
  it("matches at and above the threshold", () => {
    expect(isConfidentMatch(JEV_MATCH_THRESHOLD)).toBe(true);
    expect(isConfidentMatch(0.99)).toBe(true);
  });

  it("does not match below the threshold", () => {
    expect(isConfidentMatch(0.84)).toBe(false);
    expect(isConfidentMatch(0)).toBe(false);
  });

  it("does not match when the probability is missing", () => {
    expect(isConfidentMatch(null)).toBe(false);
    expect(isConfidentMatch(undefined)).toBe(false);
  });

  it("does not match when the probability is not finite", () => {
    expect(isConfidentMatch(Number.NaN)).toBe(false);
    expect(isConfidentMatch(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
