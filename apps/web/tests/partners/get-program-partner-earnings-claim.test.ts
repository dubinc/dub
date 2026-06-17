import { formatProgramPartnerEarningsClaim } from "@/lib/api/programs/get-program-partner-earnings-claim";
import { describe, expect, it } from "vitest";

describe("formatProgramPartnerEarningsClaim", () => {
  it("returns null when there are not enough distinct earning partners", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarnings: 1_000_000,
        distinctEarningPartners: 4,
      }),
    ).toBeNull();
  });

  it("returns null when rounded monthly earnings are below the minimum", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarnings: 99_999,
        distinctEarningPartners: 5,
      }),
    ).toBeNull();
  });

  it("rounds down to the nearest thousand dollars", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarnings: 1_095_000,
        distinctEarningPartners: 5,
      }),
    ).toBe(
      "In recent months, some of our top partners have earned over $10K in a month.",
    );
  });

  it("handles bigint values", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarnings: BigInt(2_500_000),
        distinctEarningPartners: BigInt(5),
      }),
    ).toBe(
      "In recent months, some of our top partners have earned over $25K in a month.",
    );
  });
});
