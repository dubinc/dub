import {
  ALL_TRIAL_EMAIL_TYPES,
  getDueTrialEmailTypes,
  getTrialEmailSubject,
  getTrialStartDate,
  TRIAL_EMAIL_TYPE,
  type TrialEmailType,
} from "@/lib/email/trial-email-schedule";
import { DUB_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { describe, expect, it } from "vitest";

/** Fixed trial window: trial starts 2025-01-01 UTC, ends 2025-01-15 UTC (14 days). */
const TRIAL_ENDS_AT = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));

describe("getTrialStartDate", () => {
  it("is trialEndsAt minus DUB_TRIAL_PERIOD_DAYS", () => {
    const start = getTrialStartDate(TRIAL_ENDS_AT);
    expect(start.toISOString()).toBe(
      new Date(
        Date.UTC(2025, 0, 15 - DUB_TRIAL_PERIOD_DAYS, 12, 0, 0),
      ).toISOString(),
    );
  });
});

describe("getDueTrialEmailTypes", () => {
  const emptySent = new Set<string>();

  it("returns trial-started on first calendar day of the trial", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.STARTED]);
  });

  it("returns trial-links-focus on day 2 since start (UTC)", () => {
    const now = new Date(Date.UTC(2025, 0, 3, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.LINKS_FOCUS]);
  });

  it("returns trial-partner-focus on day 4 since start (UTC)", () => {
    const now = new Date(Date.UTC(2025, 0, 5, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.PARTNER_FOCUS]);
  });

  it("returns trial-social-proof on day 6 since start (UTC)", () => {
    const now = new Date(Date.UTC(2025, 0, 7, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.SOCIAL_PROOF]);
  });

  it("returns trial-7-days-remaining when 7 calendar days remain until end", () => {
    const now = new Date(Date.UTC(2025, 0, 8, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]);
  });

  it("returns trial-3-days-remaining when 3 calendar days remain until end", () => {
    const now = new Date(Date.UTC(2025, 0, 12, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING]);
  });

  it("returns trial-ends-today on the trial end calendar day (UTC)", () => {
    const now = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.ENDS_TODAY]);
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

  it("still returns trial-started one calendar day late if cron missed day 0", () => {
    const now = new Date(Date.UTC(2025, 0, 2, 10, 0, 0));
    expect(
      getDueTrialEmailTypes({
        trialEndsAt: TRIAL_ENDS_AT,
        sent: emptySent,
        now,
      }),
    ).toEqual([TRIAL_EMAIL_TYPE.STARTED]);
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
    const sent = new Set<string>([TRIAL_EMAIL_TYPE.STARTED]);
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

describe("getTrialEmailSubject", () => {
  const expected: Record<TrialEmailType, string> = {
    [TRIAL_EMAIL_TYPE.STARTED]: "Welcome to your free Dub trial",
    [TRIAL_EMAIL_TYPE.LINKS_FOCUS]: "Get more from your links",
    [TRIAL_EMAIL_TYPE.PARTNER_FOCUS]: "Turn partners into a growth channel",
    [TRIAL_EMAIL_TYPE.SOCIAL_PROOF]: "Meet our customers",
    [TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]: "7 days left in your Dub trial",
    [TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING]: "3 days left in your Dub trial",
    [TRIAL_EMAIL_TYPE.ENDS_TODAY]: "Your Dub trial ends today",
  };

  it("has a subject for every trial email type", () => {
    expect(ALL_TRIAL_EMAIL_TYPES).toHaveLength(Object.keys(expected).length);
    for (const type of ALL_TRIAL_EMAIL_TYPES) {
      expect(getTrialEmailSubject(type)).toBe(expected[type]);
    }
  });
});
