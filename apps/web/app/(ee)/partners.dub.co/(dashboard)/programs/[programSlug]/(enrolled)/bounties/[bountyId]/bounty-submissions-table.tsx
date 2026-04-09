"use client";

import {
  type SubmissionPeriod,
  getSubmissionPeriods,
} from "@/lib/bounty/periods";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/submission-status";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps, PartnerBountySubmission } from "@/lib/types";
import { useBountySubmissionDetailsSheet } from "@/ui/partners/bounties/bounty-submission-details-sheet";
import { useClaimBountySheet } from "@/ui/partners/bounties/claim-bounty-sheet";
import { Button, StatusBadge, Table, useTable } from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

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
              minSize: 200,
              cell: ({
                row: { original },
              }: {
                row: { original: SubmissionPeriod<PartnerBountySubmission> };
              }) => {
                const config = BOUNTY_SUBMISSION_STATUS_BADGES[original.status];
                const label =
                  original.status === "submitted"
                    ? "Pending review"
                    : config?.label;

                return (
                  <div className="flex items-center gap-3">
                    <span className="min-w-[52px] text-sm font-medium leading-5 tracking-[-0.28px] text-neutral-600">
                      {original.label}
                    </span>
                    {config && (
                      <span className="sm:hidden">
                        <StatusBadge
                          variant={config.variant}
                          icon={config.icon}
                        >
                          {label}
                        </StatusBadge>
                      </span>
                    )}
                  </div>
                );
              },
            } satisfies ColumnDef<SubmissionPeriod<PartnerBountySubmission>>,
          ]
        : []),
      {
        id: "status",
        header: "Status",
        minSize: 120,
        size: 160,
        cell: ({ row: { original } }) => {
          const config = BOUNTY_SUBMISSION_STATUS_BADGES[original.status];
          if (!config) return null;
          const label =
            original.status === "submitted" ? "Pending review" : config.label;
          return (
            <StatusBadge variant={config.variant} icon={config.icon}>
              {label}
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
          const bountyInfo = resolveBountyDetails(bounty);
          const isExpired =
            bounty.endsAt !== null && new Date(bounty.endsAt) < new Date();
          const isActionable = bountyInfo?.hasSocialMetrics
            ? status === "notSubmitted"
            : status === "notSubmitted" || status === "draft";

          let buttonText = "Submit";

          if (status === "draft" && !bountyInfo?.hasSocialMetrics) {
            buttonText = "Continue";
          } else if (["submitted", "approved", "rejected"].includes(status)) {
            buttonText = "View";
          }

          const isDisabled =
            status === "notOpen" || (isExpired && isActionable);
          const isPrimary = isActionable && !isExpired;

          let disabledTooltip: string | undefined;

          if (status === "notOpen") {
            disabledTooltip = `Opens ${original.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${original.startDate.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}`;
          } else if (isExpired && isActionable) {
            disabledTooltip = "This bounty has expired";
          }

          return (
            <div className="flex justify-end">
              <Button
                variant={isPrimary ? "primary" : "secondary"}
                disabled={isDisabled}
                className="h-7 w-fit rounded-lg px-2.5 py-2"
                text={buttonText}
                onClick={() => {
                  if (isActionable) {
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

  // When there is no "submission" column (single-submission bounty), the
  // "status" column must be visible on mobile too since nothing else shows it.
  const MOBILE_HIDDEN = new Set(
    showSubmissionColumn
      ? ["status", "submitted", "reviewed"]
      : ["submitted", "reviewed"],
  );

  const table = useTable({
    data: periods,
    columns,
    getRowId: (row) => String(row.periodNumber),
    resourceName: () => "submission period",
    scrollWrapperClassName: "min-h-0",
    thClassName: (columnId) =>
      cn(
        "border-l-0 border-r-0",
        MOBILE_HIDDEN.has(columnId) && "hidden sm:table-cell",
      ),
    tdClassName: (columnId) =>
      cn(
        "border-l-0 border-r-0",
        MOBILE_HIDDEN.has(columnId) && "hidden sm:table-cell",
      ),
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
