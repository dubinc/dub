import { DUB_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { subDays } from "date-fns";

export const TRIAL_EMAIL_TYPE = {
  LINKS_FOCUS: "trial-links-focus",
  PARTNER_FOCUS: "trial-partner-focus",
  SOCIAL_PROOF: "trial-social-proof",
  SEVEN_DAYS_REMAINING: "trial-7-days-remaining",
  THREE_DAYS_REMAINING: "trial-3-days-remaining",
  ENDS_TODAY: "trial-ends-today",
} as const;

export type TrialEmailType =
  (typeof TRIAL_EMAIL_TYPE)[keyof typeof TRIAL_EMAIL_TYPE];

export const ALL_TRIAL_EMAIL_TYPES: TrialEmailType[] = [
  TRIAL_EMAIL_TYPE.LINKS_FOCUS,
  TRIAL_EMAIL_TYPE.PARTNER_FOCUS,
  TRIAL_EMAIL_TYPE.SOCIAL_PROOF,
  TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING,
  TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING,
  TRIAL_EMAIL_TYPE.ENDS_TODAY,
];

export const TRIAL_EMAIL_DAYS_FROM_START: Record<
  Exclude<
    TrialEmailType,
    "trial-7-days-remaining" | "trial-3-days-remaining" | "trial-ends-today"
  >,
  number
> = {
  [TRIAL_EMAIL_TYPE.LINKS_FOCUS]: 2,
  [TRIAL_EMAIL_TYPE.PARTNER_FOCUS]: 4,
  [TRIAL_EMAIL_TYPE.SOCIAL_PROOF]: 6,
};

function utcCalendarDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function differenceInCalendarDaysUTC(left: Date, right: Date): number {
  const l = utcCalendarDate(left).getTime();
  const r = utcCalendarDate(right).getTime();
  return Math.round((l - r) / (24 * 60 * 60 * 1000));
}

export function getTrialStartDate(trialEndsAt: Date): Date {
  return subDays(trialEndsAt, DUB_TRIAL_PERIOD_DAYS);
}

const COUNTDOWN_GRACE_DAYS = 1;

function isStartMilestoneDue(
  daysSinceStart: number,
  targetDayFromStart: number,
  nextTargetDayFromStart: number,
): boolean {
  return (
    daysSinceStart === targetDayFromStart ||
    (daysSinceStart === targetDayFromStart + 1 &&
      daysSinceStart < nextTargetDayFromStart)
  );
}

export function getDueTrialEmailTypes({
  trialEndsAt,
  sent,
  now,
}: {
  trialEndsAt: Date;
  sent: Set<string>;
  now: Date;
}): TrialEmailType[] {
  const due: TrialEmailType[] = [];

  if (now.getTime() > trialEndsAt.getTime()) {
    return due;
  }

  const trialStart = getTrialStartDate(trialEndsAt);

  const daysSinceStart = differenceInCalendarDaysUTC(now, trialStart);

  const daysUntilEnd = differenceInCalendarDaysUTC(trialEndsAt, now);

  const tryAdd = (type: TrialEmailType) => {
    if (!sent.has(type) && !due.includes(type)) {
      due.push(type);
    }
  };

  if (
    isStartMilestoneDue(
      daysSinceStart,
      TRIAL_EMAIL_DAYS_FROM_START[TRIAL_EMAIL_TYPE.LINKS_FOCUS],
      TRIAL_EMAIL_DAYS_FROM_START[TRIAL_EMAIL_TYPE.PARTNER_FOCUS],
    )
  ) {
    tryAdd(TRIAL_EMAIL_TYPE.LINKS_FOCUS);
  }
  if (
    isStartMilestoneDue(
      daysSinceStart,
      TRIAL_EMAIL_DAYS_FROM_START[TRIAL_EMAIL_TYPE.PARTNER_FOCUS],
      TRIAL_EMAIL_DAYS_FROM_START[TRIAL_EMAIL_TYPE.SOCIAL_PROOF],
    )
  ) {
    tryAdd(TRIAL_EMAIL_TYPE.PARTNER_FOCUS);
  }

  const socialTarget =
    TRIAL_EMAIL_DAYS_FROM_START[TRIAL_EMAIL_TYPE.SOCIAL_PROOF];
  if (
    daysSinceStart === socialTarget ||
    (daysSinceStart === socialTarget + 1 && daysUntilEnd > 7)
  ) {
    tryAdd(TRIAL_EMAIL_TYPE.SOCIAL_PROOF);
  }

  if (
    daysUntilEnd <= 7 &&
    daysUntilEnd >= 7 - COUNTDOWN_GRACE_DAYS &&
    daysUntilEnd >= 0
  ) {
    tryAdd(TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING);
  }
  if (
    daysUntilEnd <= 3 &&
    daysUntilEnd >= 3 - COUNTDOWN_GRACE_DAYS &&
    daysUntilEnd >= 0
  ) {
    tryAdd(TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING);
  }
  if (daysUntilEnd === 0 && now.getTime() < trialEndsAt.getTime()) {
    tryAdd(TRIAL_EMAIL_TYPE.ENDS_TODAY);
  }

  return due;
}

export function getTrialEmailSubject(type: TrialEmailType): string {
  const subjects: Record<TrialEmailType, string> = {
    [TRIAL_EMAIL_TYPE.LINKS_FOCUS]: "Get more from your links",
    [TRIAL_EMAIL_TYPE.PARTNER_FOCUS]: "Turn partners into a growth channel",
    [TRIAL_EMAIL_TYPE.SOCIAL_PROOF]: "Meet our customers",
    [TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]: "7 days left in your Dub trial",
    [TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING]: "3 days left in your Dub trial",
    [TRIAL_EMAIL_TYPE.ENDS_TODAY]: "Your Dub trial ends today",
  };
  return subjects[type];
}
