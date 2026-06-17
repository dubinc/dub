import { formatProgramPartnerEarningsClaim } from "@/lib/api/programs/get-program-partner-earnings-claim";
import { describe, expect, it } from "vitest";

describe("formatProgramPartnerEarningsClaim", () => {
  it("returns null when there are not enough distinct earning partners", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarningsCents: 1_000_000,
        distinctEarningPartnerCount: 4,
      }),
    ).toBeNull();
  });

  it("returns null when floored monthly earnings are below the minimum", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarningsCents: 99_999,
        distinctEarningPartnerCount: 5,
      }),
    ).toBeNull();
  });

  it("floors down to the nearest thousand dollars", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarningsCents: 1_095_000,
        distinctEarningPartnerCount: 5,
      }),
    ).toBe(
      "In recent months, some of our top partners have earned over $10K in a month.",
    );
  });

  it("floors to the displayed unit so the claim never rounds up", () => {
    // $2.5M would round up to "$3M" via the formatter; the claim must not
    // overstate, so it floors to "$2M".
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarningsCents: 250_000_000,
        distinctEarningPartnerCount: 5,
      }),
    ).toBe(
      "In recent months, some of our top partners have earned over $2M in a month.",
    );
  });

  it("handles bigint values", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        topMonthlyEarningsCents: BigInt(2_500_000),
        distinctEarningPartnerCount: BigInt(5),
      }),
    ).toBe(
      "In recent months, some of our top partners have earned over $25K in a month.",
    );
  });
});
