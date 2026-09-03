import {
  buildCommissionIdempotencyKey,
  hasRewardMaxDurationElapsed,
} from "@/lib/api/rewards/create-custom-reward-commissions";
import {
  getUtcPeriodDate,
  isCadenceDue,
  isCustomRewardStartDateInPast,
  isEventBasedReward,
} from "@/lib/api/rewards/custom-reward-utils";
import type { CustomRewardConfig } from "@/lib/types";
import { customRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { createHash } from "crypto";
import { describe, expect, test } from "vitest";

const monthlyConfig: CustomRewardConfig = {
  frequency: "month",
  interval: 1,
  anchorDate: "2026-01-31",
};

const weeklyConfig: CustomRewardConfig = {
  frequency: "week",
  interval: 1,
  anchorDate: "2026-04-06", // Monday
};

const biweeklyConfig: CustomRewardConfig = {
  frequency: "week",
  interval: 2,
  anchorDate: "2026-04-06",
};

const dailyConfig: CustomRewardConfig = {
  frequency: "day",
  interval: 1,
  anchorDate: "2026-04-01",
};

const quarterlyConfig: CustomRewardConfig = {
  frequency: "month",
  interval: 3,
  anchorDate: "2026-01-15",
};

const yearlyConfig: CustomRewardConfig = {
  frequency: "year",
  interval: 1,
  anchorDate: "2026-01-01",
};

describe("isCadenceDue", () => {
  test("daily is due every day on/after anchor", () => {
    expect(isCadenceDue(dailyConfig, "2026-03-31")).toBe(false);
    expect(isCadenceDue(dailyConfig, "2026-04-01")).toBe(true);
    expect(isCadenceDue(dailyConfig, "2026-04-02")).toBe(true);
  });

  test("weekly is due every 7 days from anchor", () => {
    expect(isCadenceDue(weeklyConfig, "2026-04-06")).toBe(true);
    expect(isCadenceDue(weeklyConfig, "2026-04-07")).toBe(false);
    expect(isCadenceDue(weeklyConfig, "2026-04-13")).toBe(true);
  });

  test("biweekly is due every 14 days from anchor", () => {
    expect(isCadenceDue(biweeklyConfig, "2026-04-06")).toBe(true);
    expect(isCadenceDue(biweeklyConfig, "2026-04-13")).toBe(false);
    expect(isCadenceDue(biweeklyConfig, "2026-04-20")).toBe(true);
    expect(isCadenceDue(biweeklyConfig, "2026-04-27")).toBe(false);
  });

  test("monthly clamps short months to last day", () => {
    expect(isCadenceDue(monthlyConfig, "2026-01-31")).toBe(true);
    expect(isCadenceDue(monthlyConfig, "2026-02-28")).toBe(true);
    expect(isCadenceDue(monthlyConfig, "2026-02-27")).toBe(false);
    expect(isCadenceDue(monthlyConfig, "2026-03-31")).toBe(true);
  });

  test("quarterly is due every 3 months on the same day", () => {
    expect(isCadenceDue(quarterlyConfig, "2026-01-15")).toBe(true);
    expect(isCadenceDue(quarterlyConfig, "2026-02-15")).toBe(false);
    expect(isCadenceDue(quarterlyConfig, "2026-04-15")).toBe(true);
    expect(isCadenceDue(quarterlyConfig, "2026-07-15")).toBe(true);
  });

  test("yearly is due on the same month and day", () => {
    expect(isCadenceDue(yearlyConfig, "2026-01-01")).toBe(true);
    expect(isCadenceDue(yearlyConfig, "2026-01-02")).toBe(false);
    expect(isCadenceDue(yearlyConfig, "2027-01-01")).toBe(true);
  });

  test("before anchorDate is never due", () => {
    expect(isCadenceDue(weeklyConfig, "2026-04-05")).toBe(false);
    expect(isCadenceDue(monthlyConfig, "2025-12-31")).toBe(false);
  });

  test("no backfill: past cadence ticks are not due after the period", () => {
    // Scanner only evaluates today's UTC date; a missed tick stays not due.
    expect(isCadenceDue(monthlyConfig, "2026-01-30")).toBe(false);
    expect(isCadenceDue(biweeklyConfig, "2026-04-14")).toBe(false);
  });
});

describe("buildCommissionIdempotencyKey", () => {
  test("is a deterministic sha256 of custom_reward_partner_period", () => {
    const invoiceId = buildCommissionIdempotencyKey({
      rewardId: "rw_123",
      partnerId: "pn_456",
      periodDate: "2026-04-15",
    });

    const expected = createHash("sha256")
      .update("custom_rw_123_pn_456_2026-04-15")
      .digest("hex");

    expect(invoiceId).toBe(expected);
  });

  test("does not collide with Stripe invoice ids", () => {
    const invoiceId = buildCommissionIdempotencyKey({
      rewardId: "rw_1",
      partnerId: "pn_1",
      periodDate: "2026-01-01",
    });

    expect(invoiceId.startsWith("in_")).toBe(false);
  });
});

describe("hasRewardMaxDurationElapsed", () => {
  test("null maxDuration never elapses", () => {
    expect(
      hasRewardMaxDurationElapsed({
        firstCommissionAt: new Date("2026-01-01T00:00:00.000Z"),
        maxDuration: null,
        periodDate: "2027-01-01",
      }),
    ).toBe(false);
  });

  test("elapses after N months from first commission", () => {
    expect(
      hasRewardMaxDurationElapsed({
        firstCommissionAt: new Date("2026-01-15T00:00:00.000Z"),
        maxDuration: 12,
        periodDate: "2026-12-15",
      }),
    ).toBe(false);

    expect(
      hasRewardMaxDurationElapsed({
        firstCommissionAt: new Date("2026-01-15T00:00:00.000Z"),
        maxDuration: 12,
        periodDate: "2027-01-15",
      }),
    ).toBe(true);
  });
});

describe("isEventBasedReward", () => {
  test("excludes custom rewards", () => {
    expect(isEventBasedReward({ event: "sale" })).toBe(true);
    expect(isEventBasedReward({ event: "referral" })).toBe(true);
    expect(isEventBasedReward({ event: "custom" })).toBe(false);
  });
});

describe("isCustomRewardStartDateInPast", () => {
  test("accepts today and future dates", () => {
    expect(isCustomRewardStartDateInPast(getUtcPeriodDate())).toBe(false);
    expect(isCustomRewardStartDateInPast("2099-01-01")).toBe(false);
  });

  test("rejects a past date", () => {
    expect(isCustomRewardStartDateInPast("2020-01-01")).toBe(true);
  });
});

describe("customRewardConfigSchema.anchorDate", () => {
  const base = { frequency: "month" as const, interval: 1 };

  test("accepts valid YYYY-MM-DD calendar dates", () => {
    expect(
      customRewardConfigSchema.parse({ ...base, anchorDate: "2026-01-31" })
        .anchorDate,
    ).toBe("2026-01-31");
    expect(
      customRewardConfigSchema.parse({ ...base, anchorDate: "2024-02-29" })
        .anchorDate,
    ).toBe("2024-02-29");
  });

  test("rejects impossible month-end dates", () => {
    expect(
      customRewardConfigSchema.safeParse({ ...base, anchorDate: "2026-02-31" })
        .success,
    ).toBe(false);
    expect(
      customRewardConfigSchema.safeParse({ ...base, anchorDate: "2026-04-31" })
        .success,
    ).toBe(false);
  });

  test("rejects leap-day dates in non-leap years", () => {
    expect(
      customRewardConfigSchema.safeParse({ ...base, anchorDate: "2025-02-29" })
        .success,
    ).toBe(false);
  });
});
