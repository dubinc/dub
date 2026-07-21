import { formatDate } from "@dub/utils";
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

const ENDS_AFTER_DAYS_LABELS: Record<number, string> = {
  [BOUNTY_DURATION_DAYS.twoWeeks]: "2 weeks",
  [BOUNTY_DURATION_DAYS.oneMonth]: "1 month",
  [BOUNTY_DURATION_DAYS.sixMonths]: "6 months",
};

export type StartPreset = "today" | DurationPreset | "onPartnerJoin" | "custom";
export type EndPreset = "never" | DurationPreset | "custom";

export function resolveBountyTiming({
  startPreset,
  endPreset,
  customStartsAt,
  customEndsAt,
}: {
  startPreset: StartPreset;
  endPreset: EndPreset;
  customStartsAt?: Date | null;
  customEndsAt?: Date | null;
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

export function isBountyExpired(endsAt: Date | null) {
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
      const durationLabel =
        ENDS_AFTER_DAYS_LABELS[endsAfterDays] ?? `${endsAfterDays} days`;
      dateRangeLabel = `${durationLabel} after joining`;
    } else if (endsAt) {
      dateRangeLabel = `when a new partner joins → ${formatDate(endsAt, { month: "short" })}`;
    } else {
      dateRangeLabel = "when a new partner joins";
    }
  } else {
    const startLabel = formatDate(startsAt, { month: "short" });
    dateRangeLabel = endsAt
      ? `${startLabel} → ${formatDate(endsAt, { month: "short" })}`
      : startLabel;
  }

  return {
    dateRangeLabel,
    partnerAudienceLabel: isRelative ? "New partners only" : "All partners",
  };
}
