"use client";

import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/bounty-submission-status-badges";
import { PartnerBountyProps } from "@/lib/types";
import { useClaimBountySheet } from "@/ui/partners/bounties/claim-bounty-sheet";
import { Lock } from "@/ui/shared/icons";
import { BountySubmissionFrequency } from "@dub/prisma/client";
import { Button, StatusBadge, Table, useTable } from "@dub/ui";
import { CircleDotted } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { addDays, addMonths, addWeeks } from "date-fns";
import { useMemo } from "react";

type PartnerBountySubmission = PartnerBountyProps["submissions"][number];

type SubmissionPeriodStatus =
  | "not_submitted"
  | "not_open"
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

interface SubmissionPeriod<TSubmission = { createdAt: Date }> {
  index: number;
  label: string;
  startDate: Date;
  endDate: Date;
  status: SubmissionPeriodStatus;
  submission: TSubmission | null;
}

function addFrequency(
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

function getPeriodLabel(
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

function getSubmissionPeriods<TSubmission extends { createdAt: Date }>({
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
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const end = endsAt
    ? endsAt instanceof Date
      ? endsAt
      : new Date(endsAt)
    : null;

  if (!submissionFrequency || maxSubmissions < 2) {
    const submission = submissions[0] ?? null;
    let status: SubmissionPeriodStatus;
    if (submission) {
      const s = submission as TSubmission & { status: string };
      status = s.status as SubmissionPeriodStatus;
    } else if (now < start) {
      status = "not_open";
    } else {
      status = "not_submitted";
    }
    return [
      {
        index: 0,
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
    const startDate = addFrequency(start, submissionFrequency, i);
    const endDate =
      i < maxSubmissions - 1
        ? addFrequency(startDate, submissionFrequency, 1)
        : end ?? addFrequency(startDate, submissionFrequency, 1);

    const submissionForPeriod = submissions.find((s) => {
      const created =
        s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
      return created >= startDate && created < endDate;
    });

    let status: SubmissionPeriodStatus;
    if (submissionForPeriod) {
      const s = submissionForPeriod as TSubmission & { status: string };
      status = s.status as SubmissionPeriodStatus;
    } else if (now < startDate) {
      status = "not_open";
    } else {
      status = "not_submitted";
    }

    periods.push({
      index: i,
      label: getPeriodLabel(submissionFrequency, i),
      startDate,
      endDate,
      status,
      submission: submissionForPeriod ?? null,
    });
  }

  return periods;
}

function SubmissionPeriodStatusBadge({
  status,
}: {
  status: SubmissionPeriodStatus;
}) {
  if (status === "not_submitted") {
    return (
      <div className="flex h-5 items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0">
        <CircleDotted className="size-3 shrink-0 text-neutral-700" />
        <span className="text-xs font-semibold tracking-[-0.24px] text-neutral-700">
          Not submitted
        </span>
      </div>
    );
  }

  if (status === "not_open") {
    return (
      <div className="flex h-5 items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0">
        <Lock className="size-3 shrink-0 text-neutral-700" />
        <span className="text-xs font-semibold tracking-[-0.24px] text-neutral-700">
          Not open
        </span>
      </div>
    );
  }

  const config = BOUNTY_SUBMISSION_STATUS_BADGES[status];
  if (!config) return null;

  return (
    <StatusBadge variant={config.variant} icon={config.icon}>
      {config.label}
    </StatusBadge>
  );
}

export function BountySubmissionsTable({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const { claimBountySheet, setShowClaimBountySheet } = useClaimBountySheet({
    bounty,
  });

  const periods = getSubmissionPeriods<PartnerBountySubmission>({
    startsAt: bounty.startsAt,
    endsAt: bounty.endsAt,
    submissionFrequency: bounty.submissionFrequency,
    maxSubmissions: bounty.maxSubmissions ?? 1,
    submissions: bounty.submissions ?? [],
  });

  const showSubmissionColumn = (bounty.maxSubmissions ?? 1) > 1;

  const columns = useMemo<
    ColumnDef<SubmissionPeriod<PartnerBountySubmission>>[]
  >(
    () => [
      ...(showSubmissionColumn
        ? [
            {
              id: "submission",
              header: "Submission",
              minSize: 120,
              size: 120,
              cell: ({ row: { original } }) => (
                <span className="text-sm font-medium leading-5 tracking-[-0.28px] text-neutral-600">
                  {original.label}
                </span>
              ),
            },
          ]
        : []),
      {
        id: "status",
        header: "Status",
        minSize: 120,
        size: 160,
        cell: ({ row: { original } }) => (
          <SubmissionPeriodStatusBadge status={original.status} />
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        minSize: 100,
        size: 120,
        cell: ({ row: { original } }) => (
          <span className="text-center text-sm font-medium leading-5 tracking-[-0.28px] text-neutral-600">
            {original.submission?.completedAt
              ? formatDate(original.submission.completedAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "–"}
          </span>
        ),
      },
      {
        id: "reviewed",
        header: "Reviewed",
        minSize: 100,
        size: 120,
        cell: ({ row: { original } }) => (
          <span className="text-center text-sm font-medium leading-5 tracking-[-0.28px] text-neutral-600">
            {original.submission?.reviewedAt
              ? formatDate(original.submission.reviewedAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "–"}
          </span>
        ),
      },
      {
        id: "action",
        header: "",
        minSize: 98,
        size: 98,
        cell: ({ row: { original } }) => {
          const canSubmit =
            original.status === "not_submitted" || original.status === "draft";
          return (
            <Button
              variant="secondary"
              size="sm"
              disabled={!canSubmit}
              className={
                canSubmit
                  ? "bg-bg-inverted text-content-inverted hover:bg-bg-inverted/90 h-7 rounded-lg px-2.5 py-2"
                  : "bg-bg-subtle border-border-subtle text-content-muted h-7 rounded-lg border px-2.5 py-2"
              }
              onClick={() => setShowClaimBountySheet(true)}
            >
              Submit
            </Button>
          );
        },
      },
    ],
    [bounty, showSubmissionColumn],
  );

  const table = useTable({
    data: periods,
    columns,
    getRowId: (row) => String(row.index),
    resourceName: () => "submission period",
    scrollWrapperClassName: "min-h-0",
    thClassName: "border-l-0 border-r-0",
    tdClassName: "border-l-0 border-r-0",
    className: "[&_tbody_tr:last-child_td]:border-b-0",
    containerClassName: "border-neutral-200",
  });

  return (
    <>
      {claimBountySheet}
      <div className="flex flex-col gap-3">
        <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
          Submissions
        </h2>
        <Table {...table} />
      </div>
    </>
  );
}
