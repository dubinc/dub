import { Bounty, BountyStartMode, ProgramEnrollment } from "@prisma/client";
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

  let startMode: BountyStartMode = "absolute";
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
      if (startMode === "absolute") {
        endsAt = addDays(startsAt, BOUNTY_DURATION_DAYS[endPreset]);
      } else {
        endDurationDays = BOUNTY_DURATION_DAYS[endPreset];
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
    endDurationDays,
  };
}

export type BountyTimingInput = ReturnType<typeof resolveBountyTiming>;

export function getEffectiveBountyDateRange({
  programEnrollment,
  bounty,
}: {
  programEnrollment: Pick<ProgramEnrollment, "groupJoinedAt" | "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endDurationDays" | "startMode">;
}) {
  const { createdAt, groupJoinedAt } = programEnrollment;
  const { startsAt, endsAt, endDurationDays, startMode } = bounty;

  const bountyStartDate =
    startMode === "absolute" ? startsAt : groupJoinedAt || createdAt;

  return {
    startsAt: bountyStartDate,
    endsAt: endDurationDays
      ? addDays(bountyStartDate, endDurationDays)
      : endsAt,
  };
}

export function isBountyExpired(endsAt: Date | null) {
  return endsAt !== null && endsAt <= new Date();
}
