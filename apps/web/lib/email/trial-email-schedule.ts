export const TRIAL_EMAIL_TYPE = {
  SEVEN_DAYS_REMAINING: "trial-7-days-remaining",
  THREE_DAYS_REMAINING: "trial-3-days-remaining",
} as const;

export type TrialEmailType =
  (typeof TRIAL_EMAIL_TYPE)[keyof typeof TRIAL_EMAIL_TYPE];

export const ALL_TRIAL_EMAIL_TYPES: TrialEmailType[] = [
  TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING,
  TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING,
];

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
const COUNTDOWN_GRACE_DAYS = 1;

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

  const daysUntilEnd = differenceInCalendarDaysUTC(trialEndsAt, now);

  const tryAdd = (type: TrialEmailType) => {
    if (!sent.has(type) && !due.includes(type)) {
      due.push(type);
    }
  };

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

  return due;
}

export function getTrialEmailSubject({
  type,
  companyName,
}: {
  type: TrialEmailType;
  companyName?: string;
}): string {
  const prefix =
    companyName && companyName.length <= 12 ? `Dub + ${companyName}: ` : "";

  const subjects: Record<TrialEmailType, string> = {
    [TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING]: `${prefix}7 days left in trial`,
    [TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING]: `${prefix}3 days left in trial`,
  };
  return subjects[type];
}
