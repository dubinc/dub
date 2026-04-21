import {
  getDueTrialEmailTypes,
  TRIAL_EMAIL_TYPE,
} from "@/lib/email/trial-email-schedule";
import { describe, expect, it } from "vitest";

/** Fixed trial window: trial starts 2025-01-01 UTC, ends 2025-01-15 UTC (14 days). */
const TRIAL_ENDS_AT = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));

describe("getDueTrialEmailTypes", () => {
  const emptySent = new Set<string>();

  it("returns trial7DaysRemaining when 7 calendar days remain until end", () => {
    const now = new Date(Date.UTC(2025, 0, 8, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]);
  });

  it("returns trial3DaysRemaining when 3 calendar days remain until end", () => {
    const now = new Date(Date.UTC(2025, 0, 12, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING]);
  });

  it("returns nothing after the trial end instant (no late ends-today on same UTC date)", () => {
    const now = new Date(Date.UTC(2025, 0, 15, 14, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([]);
  });

  it("returns trial-7-days-remaining one calendar day late (catch-up)", () => {
    const now = new Date(Date.UTC(2025, 0, 9, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]);
  });

  it("does not return a type that is already in sent", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
    const sent = new Set<string>([TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]);
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent,
        now,
      }),
    ).toEqual([]);
  });

  it("does not duplicate a type in the due list", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
    const due = getDueTrialEmailTypes({
      trialEndsAt: TRIAL_ENDS_AT,
      sent: emptySent,
      now,
    });
    expect(new Set(due).size).toBe(due.length);
  });

  /**
   * With a 14-day trial, no single UTC calendar day satisfies both a
   * "days since start" milestone (0,2,4,6) and a "days until end" milestone
   * (7,3,0) at once; each run returns at most one milestone from each group.
   */
  it("returns a single start-based milestone on typical milestone days", () => {
    const day2 = new Date(Date.UTC(2025, 0, 3, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now: day2,
      }),
    ).toHaveLength(1);
  });
});
