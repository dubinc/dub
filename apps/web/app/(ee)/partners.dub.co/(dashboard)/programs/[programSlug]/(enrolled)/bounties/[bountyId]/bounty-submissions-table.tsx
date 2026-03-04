"use client";

import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/bounty-submission-status-badges";
import {
  type SubmissionPeriod,
  getSubmissionPeriods,
} from "@/lib/bounty/periods";
import { PartnerBountyProps } from "@/lib/types";
import { useBountySubmissionDetailsSheet } from "@/ui/partners/bounties/bounty-submission-details-sheet";
import { useClaimBountySheet } from "@/ui/partners/bounties/claim-bounty-sheet";
import { Button, StatusBadge, Table, useTable } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

type PartnerBountySubmission = PartnerBountyProps["submissions"][number];

export function BountySubmissionsTable({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const {
    claimBountySheet,
    setShowClaimBountySheet,
    setActivePeriodNumber: setClaimPeriodNumber,
  } = useClaimBountySheet({ bounty });

  const {
    bountySubmissionDetailsSheet,
    setShowBountySubmissionDetailsSheet,
    setActivePeriodNumber: setViewPeriodNumber,
  } = useBountySubmissionDetailsSheet({ bounty });

  const periods = getSubmissionPeriods({
    startsAt: bounty.startsAt,
    endsAt: bounty.endsAt,
    submissionFrequency: bounty.submissionFrequency,
    maxSubmissions: bounty.maxSubmissions,
    submissions: bounty.submissions ?? [],
  });

  const showSubmissionColumn = bounty.maxSubmissions > 1;

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
        cell: ({ row: { original } }) => {
          const config = BOUNTY_SUBMISSION_STATUS_BADGES[original.status];

          if (!config) {
            return null;
          }

          return (
            <StatusBadge variant={config.variant} icon={config.icon}>
              {config.label}
            </StatusBadge>
          );
        },
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
          const { status } = original;

          let buttonText = "Submit";

          if (status === "draft") {
            buttonText = "Continue";
          } else if (["submitted", "approved", "rejected"].includes(status)) {
            buttonText = "View";
          }

          const isDisabled = status === "notOpen";
          const isPrimary = status === "notSubmitted" || status === "draft";

          const disabledTooltip = isDisabled
            ? `Opens ${original.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${original.startDate.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}`
            : undefined;

          return (
            <div className="flex justify-end">
              <Button
                variant={isPrimary ? "primary" : "secondary"}
                disabled={isDisabled}
                className="h-7 w-fit rounded-lg px-2.5 py-2"
                text={buttonText}
                onClick={() => {
                  if (status === "notSubmitted" || status === "draft") {
                    setClaimPeriodNumber(original.periodNumber);
                    setShowClaimBountySheet(true);
                  } else {
                    setViewPeriodNumber(original.periodNumber);
                    setShowBountySubmissionDetailsSheet(true);
                  }
                }}
                disabledTooltip={disabledTooltip}
              />
            </div>
          );
        },
      },
    ],
    [bounty, showSubmissionColumn],
  );

  const table = useTable({
    data: periods,
    columns,
    getRowId: (row) => String(row.periodNumber),
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
      {bountySubmissionDetailsSheet}
      <div className="flex flex-col gap-3">
        <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
          Submissions
        </h2>
        <Table {...table} />
      </div>
    </>
  );
}
