import { formatDate } from "@dub/utils";
import { Bounty, BountyStartMode, ProgramEnrollment } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

export type BountyStartPreset =
  | "today"
  | "in2Weeks"
  | "in1Month"
  | "in6Months"
  | "onPartnerJoin"
  | "custom";

export type BountyEndPreset =
  | "never"
  | "twoWeeks"
  | "oneMonth"
  | "sixMonths"
  | "custom";

export type BountyTimingValue = {
  startMode: BountyStartMode;
  startsAt: Date;
  endsAt: Date | null;
  endDurationDays: number | null;
};

const BOUNTY_END_DURATION_DAYS: Record<
  Exclude<BountyEndPreset, "never" | "custom">,
  number
> = {
  twoWeeks: 14,
  oneMonth: 30,
  sixMonths: 180,
};

export const BOUNTY_START_PRESET_OPTIONS: {
  value: BountyStartPreset;
  label: string;
}[] = [
  { value: "today", label: "today" },
  { value: "in2Weeks", label: "in 2 weeks" },
  { value: "in1Month", label: "in 1 month" },
  { value: "in6Months", label: "in 6 months" },
  { value: "onPartnerJoin", label: "when a new partner joins" },
  { value: "custom", label: "custom" },
];

export const BOUNTY_END_PRESET_OPTIONS: {
  value: BountyEndPreset;
  label: string;
}[] = [
  { value: "never", label: "never" },
  { value: "twoWeeks", label: "2 weeks" },
  { value: "oneMonth", label: "1 month" },
  { value: "sixMonths", label: "6 months" },
  { value: "custom", label: "custom" },
];

export function resolveBountyTiming({
  startPreset,
  endPreset,
  customStartsAt,
  customEndsAt,
}: {
  startPreset: BountyStartPreset;
  endPreset: BountyEndPreset;
  customStartsAt?: Date | null;
  customEndsAt?: Date | null;
}): BountyTimingValue {
  const now = new Date();

  let startMode: BountyStartMode = "absolute";
  let startsAt = now;

  switch (startPreset) {
    case "today":
      startsAt = now;
      break;
    case "in2Weeks":
      startsAt = addWeeks(now, 2);
      break;
    case "in1Month":
      startsAt = addMonths(now, 1);
      break;
    case "in6Months":
      startsAt = addMonths(now, 6);
      break;
    case "onPartnerJoin":
      startMode = "relative";
      startsAt = now;
      break;
    case "custom":
      startsAt = customStartsAt ?? now;
      break;
  }

  let endsAt: Date | null = null;
  let endDurationDays: number | null = null;

  switch (endPreset) {
    case "never":
      break;
    case "twoWeeks":
    case "oneMonth":
    case "sixMonths":
      endDurationDays = BOUNTY_END_DURATION_DAYS[endPreset];
      break;
    case "custom":
      endsAt = customEndsAt ?? null;
      break;
  }

  return {
    startMode,
    startsAt,
    endsAt,
    endDurationDays,
  };
}

export function getBountyEndSuffix({
  startMode,
  endPreset,
}: {
  startMode: BountyStartMode;
  endPreset: BountyEndPreset;
}): string | null {
  if (endPreset === "never" || endPreset === "custom") {
    return null;
  }

  return startMode === "relative" ? "after joining" : "from start date";
}

export function getBountyStartPresetLabel({
  startPreset,
  customStartsAt,
  startsAt,
}: {
  startPreset: BountyStartPreset;
  customStartsAt: Date | null;
  startsAt: Date;
}): string {
  if (startPreset === "custom") {
    return formatDate(customStartsAt ?? startsAt, { month: "short" });
  }

  return (
    BOUNTY_START_PRESET_OPTIONS.find((option) => option.value === startPreset)
      ?.label ?? "today"
  );
}

export function getBountyEndPresetLabel({
  endPreset,
  customEndsAt,
  endsAt,
}: {
  endPreset: BountyEndPreset;
  customEndsAt: Date | null;
  endsAt: Date | null;
}): string {
  if (endPreset === "custom" && (customEndsAt || endsAt)) {
    return formatDate(customEndsAt ?? endsAt!, { month: "short" });
  }

  return (
    BOUNTY_END_PRESET_OPTIONS.find((option) => option.value === endPreset)
      ?.label ?? "never"
  );
}

export function parseBountyTimingPresets({
  startMode,
  startsAt,
  endsAt,
  endDurationDays,
}: BountyTimingValue): {
  startPreset: BountyStartPreset;
  endPreset: BountyEndPreset;
  customStartsAt: Date | null;
  customEndsAt: Date | null;
} {
  const startPreset: BountyStartPreset =
    startMode === "relative" ? "onPartnerJoin" : "custom";

  const customStartsAt = startMode === "absolute" ? startsAt : null;

  let endPreset: BountyEndPreset = "never";
  let customEndsAt: Date | null = null;

  if (endDurationDays != null) {
    const durationPreset = (
      Object.entries(BOUNTY_END_DURATION_DAYS) as [
        Exclude<BountyEndPreset, "never" | "custom">,
        number,
      ][]
    ).find(([, days]) => days === endDurationDays)?.[0];

    if (durationPreset) {
      endPreset = durationPreset;
    }
  } else if (endsAt) {
    endPreset = "custom";
    customEndsAt = endsAt;
  }

  return {
    startPreset,
    endPreset,
    customStartsAt,
    customEndsAt,
  };
}

export function getEffectiveBountyDateRange({
  programEnrollment,
  bounty,
}: {
  programEnrollment: Pick<ProgramEnrollment, "groupJoinedAt" | "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endDurationDays" | "startMode">;
}) {
  const { createdAt, groupJoinedAt } = programEnrollment;
  const { startsAt, endsAt, endDurationDays, startMode } = bounty;

  if (startMode === "absolute") {
    return {
      startsAt,
      endsAt,
    };
  }

  const bountyStartDate = groupJoinedAt || createdAt;

  return {
    startsAt: groupJoinedAt,
    endsAt: addDays(bountyStartDate, endDurationDays ?? 0),
  };
}
