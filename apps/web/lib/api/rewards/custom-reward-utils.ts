import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import type { CustomRewardConfig } from "@/lib/types";
import { CUSTOM_REWARD_CADENCE_PRESETS } from "@/lib/zod/schemas/rewards";
import { tz } from "@date-fns/tz";
import { pluralize } from "@dub/utils";
import { EventType } from "@prisma/client";
import { createHash } from "crypto";
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  differenceInMonths,
  format,
} from "date-fns";

export function isEventBasedReward<T extends { event: EventType }>(
  reward: T,
): reward is T & { event: Exclude<EventType, "custom"> } {
  return reward.event !== EventType.custom;
}

export function toUtcDateOnly(date: Date | string): Date {
  if (typeof date === "string") {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getUtcPeriodDate(date: Date | string = new Date()): string {
  return formatUtcDate(toUtcDateOnly(date));
}

export function isCustomRewardStartDateInPast(anchorDate: string): boolean {
  return anchorDate < getUtcPeriodDate();
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function expectedUtcDayOfMonth(anchor: Date, candidate: Date) {
  const anchorDay = anchor.getUTCDate();
  const daysInCandidateMonth = daysInUtcMonth(
    candidate.getUTCFullYear(),
    candidate.getUTCMonth(),
  );
  return Math.min(anchorDay, daysInCandidateMonth);
}

export function isCadenceDue(
  config: CustomRewardConfig,
  dateUTC: Date | string,
): boolean {
  const today = toUtcDateOnly(dateUTC);
  const anchor = toUtcDateOnly(config.anchorDate);

  if (today.getTime() < anchor.getTime()) {
    return false;
  }

  const { frequency, interval } = config;

  if (frequency === "day") {
    const daysDiff = differenceInCalendarDays(today, anchor, { in: tz("UTC") });
    return daysDiff % interval === 0;
  }

  if (frequency === "week") {
    const daysDiff = differenceInCalendarDays(today, anchor, { in: tz("UTC") });
    return daysDiff % (interval * 7) === 0;
  }

  if (frequency === "month") {
    if (today.getUTCDate() !== expectedUtcDayOfMonth(anchor, today)) {
      return false;
    }

    const monthsDiff = differenceInCalendarMonths(today, anchor, {
      in: tz("UTC"),
    });
    return monthsDiff % interval === 0;
  }

  // year
  if (
    today.getUTCMonth() !== anchor.getUTCMonth() ||
    today.getUTCDate() !== expectedUtcDayOfMonth(anchor, today)
  ) {
    return false;
  }

  const yearsDiff = differenceInCalendarYears(today, anchor, { in: tz("UTC") });
  return yearsDiff % interval === 0;
}

const CADENCE_LABELS: Record<CustomRewardConfig["frequency"], string> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
  year: "yearly",
};

function formatCadenceLabel({
  frequency,
  interval,
}: Pick<CustomRewardConfig, "frequency" | "interval">) {
  const preset = CUSTOM_REWARD_CADENCE_PRESETS.find(
    (p) => p.frequency === frequency && p.interval === interval,
  );

  if (preset) {
    return preset.label.toLowerCase();
  }

  if (interval === 1) {
    return CADENCE_LABELS[frequency];
  }

  return `every ${interval} ${pluralize(frequency, interval)}`;
}

export function formatCommissionDescription({
  amountInCents,
  frequency,
  interval,
  periodDate,
}: Pick<CustomRewardConfig, "frequency" | "interval"> & {
  amountInCents: number;
  periodDate: string;
}) {
  const cadenceLabel = formatCadenceLabel({ frequency, interval });
  const periodFormat =
    frequency === "day" || frequency === "week" ? "MMM d, yyyy" : "MMM yyyy";
  const periodLabel = format(toUtcDateOnly(periodDate), periodFormat, {
    in: tz("UTC"),
  });
  const amountLabel = constructRewardAmount({
    type: "flat",
    amountInCents,
    amountInPercentage: null,
  });

  return `${amountLabel} ${cadenceLabel} · ${periodLabel}`;
}

export function buildCommissionIdempotencyKey({
  rewardId,
  partnerId,
  periodDate,
}: {
  rewardId: string;
  partnerId: string;
  periodDate: string;
}) {
  return createHash("sha256")
    .update(`custom_${rewardId}_${partnerId}_${periodDate}`)
    .digest("hex");
}

export function hasRewardMaxDurationElapsed({
  firstCommissionAt,
  maxDuration,
  periodDate,
}: {
  firstCommissionAt: Date;
  maxDuration: number | null | undefined;
  periodDate: Date | string;
}): boolean {
  // null / undefined = infinite
  if (maxDuration == null) {
    return false;
  }

  const period = toUtcDateOnly(periodDate);
  const first = toUtcDateOnly(firstCommissionAt);

  return differenceInMonths(period, first, { in: tz("UTC") }) >= maxDuration;
}
