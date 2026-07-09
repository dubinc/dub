import {
  formatProgramPartnerEarningsClaim,
  getActiveMonthCount,
} from "@/lib/api/programs/get-program-partner-earnings-claim";
import { describe, expect, it } from "vitest";

// endDate is always a UTC month start (the current month), spanning a 6-month
// lookback back to January.
const END_DATE = new Date(Date.UTC(2026, 6, 1)); // 2026-07-01

describe("formatProgramPartnerEarningsClaim", () => {
  it("returns null when there are not enough distinct earning partners", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        avgMonthlyEarningsCents: 1_000_000,
        distinctEarningPartnerCount: 1,
      }),
    ).toBeNull();
  });

  it("returns null when floored monthly earnings are below the minimum", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        avgMonthlyEarningsCents: 99_999,
        distinctEarningPartnerCount: 5,
      }),
    ).toBeNull();
  });

  it("omits over when monthly earnings exactly match the displayed threshold", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        avgMonthlyEarningsCents: 100_000,
        distinctEarningPartnerCount: 5,
      }),
    ).toBe("Some of our top partners earn $1K per month on average.");
  });

  it("floors down to the nearest thousand dollars", () => {
    expect(
      formatProgramPartnerEarningsClaim({
        avgMonthlyEarningsCents: 1_095_000,
        distinctEarningPartnerCount: 5,
      }),
    ).toBe("Some of our top partners earn over $10K per month on average.");
  });

  it("floors to the displayed unit so the claim never rounds up", () => {
    // $2.5M would round up to "$3M" via the formatter; the claim must not
    // overstate, so it floors to "$2M".
    expect(
      formatProgramPartnerEarningsClaim({
        avgMonthlyEarningsCents: 250_000_000,
        distinctEarningPartnerCount: 5,
      }),
    ).toBe("Some of our top partners earn over $2M per month on average.");
  });

  it("floors fractional averaged earnings down to the displayed unit", () => {
    // The top partner's lookback total divided by their active months can be
    // fractional (e.g. $155k over 6 months ≈ $25,833.33/mo); flooring must
    // still produce a clean, conservative figure.
    expect(
      formatProgramPartnerEarningsClaim({
        avgMonthlyEarningsCents: 2_583_333.33,
        distinctEarningPartnerCount: 5,
      }),
    ).toBe("Some of our top partners earn over $25K per month on average.");
  });
});

describe("getActiveMonthCount", () => {
  it("uses the full lookback when the partner earned across the whole window", () => {
    // Earliest earning at or before the window start -> full 6 months.
    expect(getActiveMonthCount(new Date(Date.UTC(2026, 0, 15)), END_DATE)).toBe(
      6,
    );
  });

  it("counts only the months a newer partner has been earning", () => {
    // First earning in May -> May and June are complete -> 2 months.
    expect(getActiveMonthCount(new Date(Date.UTC(2026, 4, 20)), END_DATE)).toBe(
      2,
    );
  });

  it("returns at least 1 for a partner that just started earning", () => {
    // First earning in the final complete month -> 1 month, never 0.
    expect(getActiveMonthCount(new Date(Date.UTC(2026, 5, 10)), END_DATE)).toBe(
      1,
    );
  });

  it("caps at the lookback even when earnings predate the window", () => {
    expect(getActiveMonthCount(new Date(Date.UTC(2025, 2, 1)), END_DATE)).toBe(
      6,
    );
  });
});
