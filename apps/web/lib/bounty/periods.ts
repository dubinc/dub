import { BountySubmissionFrequency } from "@dub/prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

/**
 * Add a frequency-based duration to a date.
 */
export function addFrequency(
  date: Date,
  frequency: BountySubmissionFrequency,
  amount: number,
): Date {
  switch (frequency) {
    case "day":
      return addDays(date, amount);
    case "week":
      return addWeeks(date, amount);
    case "month":
      return addMonths(date, amount);
    default:
      return addWeeks(date, amount);
  }
}

/**
 * Get a human-readable label for a period (0-indexed input).
 */
export function getPeriodLabel(
  frequency: BountySubmissionFrequency,
  index: number,
): string {
  const n = index + 1;
  switch (frequency) {
    case "day":
      return `Day ${n}`;
    case "week":
      return `Week ${n}`;
    case "month":
      return `Month ${n}`;
    default:
      return `Week ${n}`;
  }
}

/**
 * Determine the current active period number (1-indexed) based on
 * the bounty's startsAt, submissionFrequency, and maxSubmissions.
 * Returns null if now is before startsAt or after all periods.
 * For single-submission bounties, always returns 1 (if started).
 */
export function getCurrentPeriodNumber({
  startsAt,
  endsAt,
  submissionFrequency,
  maxSubmissions,
}: {
  startsAt: Date;
  endsAt: Date | null;
  submissionFrequency: BountySubmissionFrequency | null;
  maxSubmissions: number;
}): number | null {
  const now = new Date();
  const start = new Date(startsAt);

  if (now < start) return null;
  if (!submissionFrequency || maxSubmissions < 2) return 1;

  for (let i = 0; i < maxSubmissions; i++) {
    const periodStart = addFrequency(start, submissionFrequency, i);
    const periodEnd =
      i < maxSubmissions - 1
        ? addFrequency(start, submissionFrequency, i + 1)
        : endsAt
          ? new Date(endsAt)
          : addFrequency(start, submissionFrequency, i + 1);

    if (now >= periodStart && now < periodEnd) {
      return i + 1;
    }
  }

  return null;
}

// --- Types ---

export type SubmissionPeriodStatus =
  | "not_submitted"
  | "not_open"
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export interface SubmissionPeriod<TSubmission = unknown> {
  periodNumber: number;
  label: string;
  startDate: Date;
  endDate: Date;
  status: SubmissionPeriodStatus;
  submission: TSubmission | null;
}

/**
 * Build the list of submission periods, matching submissions by periodNumber.
 */
export function getSubmissionPeriods<
  TSubmission extends { periodNumber: number; status: string },
>({
  startsAt,
  endsAt,
  submissionFrequency,
  maxSubmissions,
  submissions,
}: {
  startsAt: Date;
  endsAt: Date | null;
  submissionFrequency: BountySubmissionFrequency | null;
  maxSubmissions: number;
  submissions: TSubmission[];
}): SubmissionPeriod<TSubmission>[] {
  const now = new Date();
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  if (!submissionFrequency || maxSubmissions < 2) {
    const submission = submissions.find((s) => s.periodNumber === 1) ?? null;
    let status: SubmissionPeriodStatus;
    if (submission) {
      status = submission.status as SubmissionPeriodStatus;
    } else if (now < start) {
      status = "not_open";
    } else {
      status = "not_submitted";
    }
    return [
      {
        periodNumber: 1,
        label: "Submission",
        startDate: start,
        endDate: end ?? start,
        status,
        submission,
      },
    ];
  }

  const periods: SubmissionPeriod<TSubmission>[] = [];

  for (let i = 0; i < maxSubmissions; i++) {
    const periodNumber = i + 1;
    const startDate = addFrequency(start, submissionFrequency, i);
    const endDate =
      i < maxSubmissions - 1
        ? addFrequency(start, submissionFrequency, i + 1)
        : end ?? addFrequency(start, submissionFrequency, i + 1);

    const submissionForPeriod =
      submissions.find((s) => s.periodNumber === periodNumber) ?? null;

    let status: SubmissionPeriodStatus;
    if (submissionForPeriod) {
      status = submissionForPeriod.status as SubmissionPeriodStatus;
    } else if (now < startDate) {
      status = "not_open";
    } else {
      status = "not_submitted";
    }

    periods.push({
      periodNumber,
      label: getPeriodLabel(submissionFrequency, i),
      startDate,
      endDate,
      status,
      submission: submissionForPeriod,
    });
  }

  return periods;
}
