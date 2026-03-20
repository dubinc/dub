"use client";

import {
  type SubmissionPeriod,
  getSubmissionPeriods,
} from "@/lib/bounty/periods";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/submission-status";
import { PartnerBountyProps, PartnerBountySubmission } from "@/lib/types";
import { Button, StatusBadge, Table, useTable } from "@dub/ui";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

export function EmbedBountySubmissionsTable({
  bounty,
  onSubmit,
  onView,
}: {
  bounty: PartnerBountyProps;
  onSubmit: (periodNumber: number) => void;
  onView: (periodNumber: number) => void;
}) {
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
                row: {
                  original: SubmissionPeriod<PartnerBountySubmission>;
                };
              }) => {
                const config = BOUNTY_SUBMISSION_STATUS_BADGES[original.status];
                const label =
                  original.status === "submitted"
                    ? "Pending review"
                    : config?.label;
                return (
                  <div className="flex items-center gap-3">
                    <span className="text-content-subtle min-w-[52px] text-sm font-medium leading-5 tracking-[-0.28px]">
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
        id: "action",
        header: "",
        minSize: 98,
        size: 98,
        cell: ({ row: { original } }) => {
          const { status, periodNumber } = original;
          const isExpired =
            bounty.endsAt !== null && new Date(bounty.endsAt) < new Date();
          const isActionable =
            status === "notSubmitted" ||
            (status === "draft" &&
              !bounty.submissionRequirements?.socialMetrics);

          let buttonText = "Submit";
          if (status === "draft") {
            if (bounty.submissionRequirements?.socialMetrics) {
              buttonText = "View";
            } else {
              buttonText = "Continue";
            }
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
                    onSubmit(periodNumber);
                  } else {
                    onView(periodNumber);
                  }
                }}
                disabledTooltip={disabledTooltip}
              />
            </div>
          );
        },
      },
    ],
    [bounty, showSubmissionColumn, onSubmit, onView],
  );

  const { table, ...tableProps } = useTable({
    data: periods,
    columns,
    getRowId: (row) => String(row.periodNumber),
    resourceName: () => "submission period",
    scrollWrapperClassName: "min-h-0",
    thClassName: () => "border-l-0 border-r-0",
    tdClassName: () => "border-l-0 border-r-0",
    className: "[&_tbody_tr:last-child_td]:border-b-0",
    containerClassName: "border-border-subtle",
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-content-emphasis text-sm font-semibold">
        Submissions
      </h2>
      <Table {...tableProps} table={table} />
    </div>
  );
}
