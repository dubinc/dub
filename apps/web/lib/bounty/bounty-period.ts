import { formatDate, pluralize } from "@dub/utils";
import { BountyStartMode } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

export const BOUNTY_DURATION_PRESETS = [
  "twoWeeks",
  "oneMonth",
  "sixMonths",
] as const;

export type DurationPreset = (typeof BOUNTY_DURATION_PRESETS)[number];

export const BOUNTY_DURATION_DAYS: Record<DurationPreset, number> = {
  twoWeeks: 14,
  oneMonth: 30,
  sixMonths: 180,
};

export const BOUNTY_DURATION_UNITS = ["day", "week", "month"] as const;

export type BountyDurationUnit = (typeof BOUNTY_DURATION_UNITS)[number];

// Months are stored as 30 days, matching the presets above
export const BOUNTY_DURATION_UNIT_DAYS: Record<BountyDurationUnit, number> = {
  day: 1,
  week: 7,
  month: 30,
};

export const BOUNTY_MAX_ENDS_AFTER_DAYS = 730;

const ENDS_AFTER_DAYS_LABELS: Record<number, string> = {
  [BOUNTY_DURATION_DAYS.twoWeeks]: "2 weeks",
  [BOUNTY_DURATION_DAYS.oneMonth]: "1 month",
  [BOUNTY_DURATION_DAYS.sixMonths]: "6 months",
};

// The unit typed for a custom duration isn't stored, so non-presets show in days
export function formatEndsAfterDays(days: number) {
  return ENDS_AFTER_DAYS_LABELS[days] ?? `${days} ${pluralize("day", days)}`;
}

export type StartPreset = "today" | DurationPreset | "onPartnerJoin" | "custom";
export type EndPreset = "never" | DurationPreset | "customDuration" | "custom";

export function resolveBountyTiming({
  startPreset,
  endPreset,
  customStartsAt,
  customEndsAt,
  customEndsAfterDays,
}: {
  startPreset: StartPreset;
  endPreset: EndPreset;
  customStartsAt?: Date | null;
  customEndsAt?: Date | null;
  customEndsAfterDays?: number | null;
}) {
  const now = new Date();

  let startMode: BountyStartMode = BountyStartMode.absolute;
  let startsAt = now;

  switch (startPreset) {
    case "today":
      startsAt = now;
      break;
    case "twoWeeks":
      startsAt = addWeeks(now, 2);
      break;
    case "oneMonth":
      startsAt = addMonths(now, 1);
      break;
    case "sixMonths":
      startsAt = addMonths(now, 6);
      break;
    case "onPartnerJoin":
      startMode = BountyStartMode.relative;
      startsAt = now;
      break;
    case "custom":
      startsAt = customStartsAt ?? now;
      break;
  }

  let endsAt: Date | null = null;
  let endsAfterDays: number | null = null;

  switch (endPreset) {
    case "never":
      break;
    case "twoWeeks":
    case "oneMonth":
    case "sixMonths":
      if (startMode === BountyStartMode.absolute) {
        endsAt = addDays(startsAt, BOUNTY_DURATION_DAYS[endPreset]);
      } else {
        endsAfterDays = BOUNTY_DURATION_DAYS[endPreset];
      }
      break;
    case "customDuration":
      if (customEndsAfterDays == null) break;
      if (startMode === BountyStartMode.absolute) {
        endsAt = addDays(startsAt, customEndsAfterDays);
      } else {
        endsAfterDays = customEndsAfterDays;
      }
      break;
    case "custom":
      endsAt = customEndsAt ?? null;
      break;
  }

  return {
    startMode,
    startsAt,
    endsAt,
    endsAfterDays,
  };
}

export function isBountyStarted(startsAt: Date) {
  return startsAt <= new Date();
}

export function isBountyEnded(endsAt: Date | null) {
  return endsAt !== null && endsAt <= new Date();
}

export function getProgramBountyMeta({
  startsAt,
  endsAt,
  startMode,
  endsAfterDays,
}: {
  startsAt: Date | null;
  endsAt: Date | null;
  startMode: BountyStartMode;
  endsAfterDays: number | null;
}) {
  const isRelative = startMode === BountyStartMode.relative || !startsAt;

  let dateRangeLabel: string;

  if (isRelative) {
    if (endsAfterDays != null) {
      dateRangeLabel = `${formatEndsAfterDays(endsAfterDays)} after joining`;
    } else if (endsAt) {
      dateRangeLabel = `When a new partner joins → ${formatDate(endsAt, { month: "short" })}`;
    } else {
      dateRangeLabel = "When a new partner joins";
    }
  } else {
    const startLabel = formatDate(startsAt, { month: "short" });
    dateRangeLabel = endsAt
      ? `${startLabel} → ${formatDate(endsAt, { month: "short" })}`
      : startLabel;
  }

  return {
    dateRangeLabel,
  };
}
