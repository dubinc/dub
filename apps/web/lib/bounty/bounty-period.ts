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
  let endsAfterDays: number | null = null;

  switch (endPreset) {
    case "never":
      break;
    case "twoWeeks":
    case "oneMonth":
    case "sixMonths":
      if (startMode === "absolute") {
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

export function getEffectiveBountyPeriod({
  programEnrollment,
  bounty,
}: {
  programEnrollment: Pick<ProgramEnrollment, "groupJoinedAt" | "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endsAfterDays" | "startMode">;
}) {
  const { createdAt, groupJoinedAt } = programEnrollment;
  const { startsAt, endsAt, endsAfterDays, startMode } = bounty;

  // If startMode is absolute, use the startsAt (Assumed to be set).
  // If startMode is relative, use the groupJoinedAt or createdAt.
  const bountyStartDate =
    startMode === "absolute" ? startsAt! : groupJoinedAt || createdAt;

  return {
    startsAt: bountyStartDate,
    endsAt: endsAfterDays ? addDays(bountyStartDate, endsAfterDays) : endsAt,
  };
}

export function isBountyStarted(startsAt: Date) {
  return startsAt <= new Date();
}

export function isBountyExpired(endsAt: Date | null) {
  return endsAt !== null && endsAt <= new Date();
}
