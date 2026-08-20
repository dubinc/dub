import { scrapedCountSchema } from "@/lib/api/scrape-creators/schema";
import { describe, expect, it } from "vitest";

describe("scrapedCountSchema", () => {
  it("rounds abbreviated-count float artifacts to the nearest integer", () => {
    expect(scrapedCountSchema.parse(16.1 * 1000)).toBe(16100);
    expect(scrapedCountSchema.parse(16099.999999999998)).toBe(16100);
    expect(BigInt(scrapedCountSchema.parse(16.1 * 1000))).toBe(16100n);
  });

  it("passes integers through unchanged", () => {
    expect(scrapedCountSchema.parse(0)).toBe(0);
    expect(scrapedCountSchema.parse(16100)).toBe(16100);
    expect(scrapedCountSchema.parse(1_000_000)).toBe(1_000_000);
  });

  it("coerces null and undefined to 0", () => {
    expect(scrapedCountSchema.parse(null)).toBe(0);
    expect(scrapedCountSchema.parse(undefined)).toBe(0);
  });
});
