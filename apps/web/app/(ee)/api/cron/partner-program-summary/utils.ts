import { endOfMonth, format, parse, subMonths } from "date-fns";
import * as z from "zod/v4";

// Both phases of the monthly summary go through this queue (see ./route.ts)
export const PARTNER_PROGRAM_SUMMARY_QUEUE = "send-partner-summary";

// Partner stats are staged in Redis by /process and read back by /send
export const PARTNER_PROGRAM_SUMMARY_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Maximum number of programs included in a partner's summary email
export const MAX_PROGRAMS_PER_SUMMARY = 10;

export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Expected a month in the format yyyy-MM");

export type PartnerProgramSummaryMonthMetrics = {
  earnings: number;
  clicks: number;
  leads: number;
  sales: number;
};

export type PartnerProgramSummaryStats = {
  previousMonth: PartnerProgramSummaryMonthMetrics;
  currentMonth: PartnerProgramSummaryMonthMetrics;
};

export function monthHasNoActivity(m: PartnerProgramSummaryMonthMetrics) {
  return m.earnings === 0 && m.clicks === 0 && m.leads === 0 && m.sales === 0;
}

// The reporting month (e.g. "2026-08") and the month before it, used to compare performance
export function getReportingPeriod(yearMonth: string) {
  const currentMonth = parse(yearMonth, "yyyy-MM", new Date());
  const previousMonth = subMonths(currentMonth, 1);

  return {
    currentMonth,
    previousMonth,
    month: format(currentMonth, "MMMM yyyy"),
    start: currentMonth.toISOString(),
    end: endOfMonth(currentMonth).toISOString(),
  };
}

export function getPartnerProgramSummaryKeys(yearMonth: string) {
  const prefix = `partner-program-summary:${yearMonth}`;

  return {
    // sorted set of every partner ID that has at least one program summary
    partners: `${prefix}:partners`,
    // hash of programId -> PartnerProgramSummaryStats for a partner
    partner: (partnerId: string) => `${prefix}:partner:${partnerId}`,
  };
}
