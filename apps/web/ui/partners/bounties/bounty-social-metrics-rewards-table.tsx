"use client";

import {
  getSocialMetricsMilestoneStatus,
  getVisibleSocialMetricsMilestones,
  SocialMetricsMilestoneRow,
  SocialMetricsMilestoneStatus,
  SubmissionMilestoneInput,
} from "@/lib/bounty/social-metrics-milestones";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import { StatusBadge, Table, useScrollProgress, useTable } from "@dub/ui";
import { capitalize, currencyFormatter } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useRef } from "react";

const milestoneStatusBadges = {
  approved: {
    label: "Approved",
    variant: "success",
  },
  pending: {
    label: "Pending approval",
    variant: "new",
  },
  inProgress: {
    label: "In progress",
    variant: "pending",
  },
  rejected: {
    label: "Rejected",
    variant: "error",
  },
} as const satisfies Record<
  SocialMetricsMilestoneStatus,
  { label: string; variant: string }
>;

export function BountySocialMetricsRewardsTable({
  bounty,
  submission,
  titleText = "Rewards",
}: {
  bounty: Pick<PartnerBountyProps, "submissionRequirements" | "rewardAmount">;
  submission: SubmissionMilestoneInput & Pick<BountySubmissionProps, "status">;
  titleText?: string;
}) {
  const milestones = getVisibleSocialMetricsMilestones({
    bounty,
    submission,
  });

  const metric = resolveBountyDetails(bounty)?.socialMetrics?.metric ?? "";

  const columns = useMemo<ColumnDef<SocialMetricsMilestoneRow>[]>(
    () => [
      {
        id: "threshold",
        header: capitalize(metric)!,
        minSize: 100,
        size: 120,
        cell: ({ row: { original } }) => (
          <span className="text-content-default font-medium">
            {original.threshold.toLocaleString()}
          </span>
        ),
      },
      {
        id: "reward",
        header: "Amount",
        minSize: 100,
        size: 120,
        cell: ({ row: { original } }) =>
          currencyFormatter(original.rewardAmount, {
            trailingZeroDisplay: "stripIfInteger",
          }),
      },
      {
        id: "status",
        header: "Status",
        minSize: 120,
        size: 140,
        cell: ({ row: { original } }) => {
          const badge =
            milestoneStatusBadges[
              getSocialMetricsMilestoneStatus({
                milestone: original,
                submission,
              })
            ];

          return (
            <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
          );
        },
      },
    ],
    [metric, submission],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const table = useTable({
    data: milestones,
    columns,
    getRowId: (row) => String(row.threshold),
    resourceName: () => "milestone",
    scrollWrapperClassName: "min-h-0 max-h-[300px] overflow-y-auto",
    thClassName: "sticky top-0 z-10 border-l-0 bg-white",
    tdClassName: "border-l-0",
    className: "[&_tbody_tr:last-child_td]:border-b-0",
  });

  if (milestones.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-content-emphasis text-base font-semibold">
        {titleText}
      </h2>
      <div className="relative mt-3">
        <Table
          {...table}
          scrollWrapperRef={scrollRef}
          onScroll={updateScrollProgress}
        />
        <div
          className="pointer-events-none absolute inset-x-px bottom-px z-10 h-16 rounded-b-[11px] bg-gradient-to-t from-white to-transparent"
          style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
        />
      </div>
    </div>
  );
}
