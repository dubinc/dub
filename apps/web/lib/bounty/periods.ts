import { BountySubmissionFrequency } from "@dub/prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

export type SubmissionPeriodStatus =
  | "notSubmitted"
  | "notOpen"
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

// Add a frequency-based duration to a date.
export function addFrequency({
  date,
  frequency,
  amount,
}: {
  date: Date;
  frequency: BountySubmissionFrequency;
  amount: number;
}): Date {
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

// Get a human-readable label for a period (0-indexed input).
export function getPeriodLabel(
  frequency: BountySubmissionFrequency | null,
  index: number,
): string {
  const n = index + 1;

  if (!frequency) {
    return `Submission ${n}`;
  }

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

  if (now < start) {
    return null;
  }

  if (maxSubmissions < 2) {
    const end = endsAt ? new Date(endsAt) : null;
    return end && now >= end ? null : 1;
  }

  // all periods open, caller picks
  if (!submissionFrequency) {
    return null;
  }

  for (let i = 0; i < maxSubmissions; i++) {
    const periodStart = addFrequency({
      date: start,
      frequency: submissionFrequency,
      amount: i,
    });

    let periodEnd: Date;

    if (i < maxSubmissions - 1) {
      periodEnd = addFrequency({
        date: start,
        frequency: submissionFrequency,
        amount: i + 1,
      });
    } else if (endsAt) {
      periodEnd = new Date(endsAt);
    } else {
      periodEnd = addFrequency({
        date: start,
        frequency: submissionFrequency,
        amount: i + 1,
      });
    }

    if (now >= periodStart && now < periodEnd) {
      return i + 1;
    }
  }

  return null;
}

// Build the list of submission periods, matching submissions by periodNumber.
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

  // Case 1: Single-submission bounty
  if (maxSubmissions < 2) {
    let status: SubmissionPeriodStatus;
    const submission = submissions.find((s) => s.periodNumber === 1) ?? null;

    if (submission) {
      status = submission.status as SubmissionPeriodStatus;
    } else if (now < start) {
      status = "notOpen";
    } else {
      status = "notSubmitted";
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

  // Case 2: Multi-submission WITHOUT frequency — all periods open immediately
  if (!submissionFrequency) {
    const periods: SubmissionPeriod<TSubmission>[] = [];

    for (let i = 0; i < maxSubmissions; i++) {
      const periodNumber = i + 1;
      const submissionForPeriod =
        submissions.find((s) => s.periodNumber === periodNumber) ?? null;

      let status: SubmissionPeriodStatus;

      if (submissionForPeriod) {
        status = submissionForPeriod.status as SubmissionPeriodStatus;
      } else if (now < start) {
        status = "notOpen";
      } else {
        status = "notSubmitted";
      }

      periods.push({
        periodNumber,
        label: getPeriodLabel(null, i),
        startDate: start,
        endDate: end ?? start,
        status,
        submission: submissionForPeriod,
      });
    }

    return periods;
  }

  // Case 3: Multi-submission WITH frequency — time-gated periods
  // All periods share the same end date (bounty end) so partners can submit
  // for any period up until the final deadline.
  const periods: SubmissionPeriod<TSubmission>[] = [];
  const periodEndDate =
    end ??
    addFrequency({
      date: start,
      frequency: submissionFrequency,
      amount: maxSubmissions,
    });

  for (let i = 0; i < maxSubmissions; i++) {
    const periodNumber = i + 1;
    const startDate = addFrequency({
      date: start,
      frequency: submissionFrequency,
      amount: i,
    });
    const endDate = periodEndDate;

    const submissionForPeriod =
      submissions.find((s) => s.periodNumber === periodNumber) ?? null;

    let status: SubmissionPeriodStatus;

    if (submissionForPeriod) {
      status = submissionForPeriod.status as SubmissionPeriodStatus;
    } else if (now < startDate) {
      status = "notOpen";
    } else {
      status = "notSubmitted";
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
