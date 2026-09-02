import type { CustomRewardConfig } from "@/lib/types";
import { EventType } from "@prisma/client";
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
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
    const daysDiff = differenceInCalendarDays(today, anchor);
    return daysDiff % interval === 0;
  }

  if (frequency === "week") {
    const daysDiff = differenceInCalendarDays(today, anchor);
    return daysDiff % (interval * 7) === 0;
  }

  if (frequency === "month") {
    if (today.getUTCDate() !== expectedUtcDayOfMonth(anchor, today)) {
      return false;
    }

    const monthsDiff = differenceInCalendarMonths(today, anchor);
    return monthsDiff % interval === 0;
  }

  // year
  if (
    today.getUTCMonth() !== anchor.getUTCMonth() ||
    today.getUTCDate() !== expectedUtcDayOfMonth(anchor, today)
  ) {
    return false;
  }

  const yearsDiff = differenceInCalendarYears(today, anchor);
  return yearsDiff % interval === 0;
}
