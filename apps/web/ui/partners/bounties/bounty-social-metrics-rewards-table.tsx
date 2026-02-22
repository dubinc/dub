"use client";

import {
  getSocialMetricsRewardTiers,
  resolveBountyDetails,
  SocialMetricsRewardTier,
} from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import { ProgressCircle, StatusBadge, Table, useTable } from "@dub/ui";
import { capitalize, currencyFormatter } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

const displayStatusMap = {
  approved: {
    label: "Approved",
    variant: "success",
  },
  pending: {
    label: "Pending",
    variant: "pending",
  },
  inProgress: {
    label: "In progress",
    variant: "pending",
  },
};

function getDisplayStatus(
  tier: SocialMetricsRewardTier,
  submission: Pick<
    BountySubmissionProps,
    "socialMetricCount" | "commission" | "status"
  >,
) {
  if (tier.status === "unmet") {
    return "inProgress";
  }

  if (
    submission.status === "approved" &&
    submission.commission != null &&
    submission.commission.earnings != null
  ) {
    return "approved";
  }

  return "pending";
}

export function BountySocialMetricsRewardsTable({
  bounty,
  submission,
}: {
  bounty: Pick<
    PartnerBountyProps,
    "id" | "submissionRequirements" | "rewardAmount"
  >;
  submission: Pick<
    BountySubmissionProps,
    "socialMetricCount" | "commission" | "status"
  >;
}) {
  const tiers = getSocialMetricsRewardTiers({
    bounty,
    submission,
  });

  const bountyInfo = resolveBountyDetails(bounty);
  const metricLabel = bountyInfo?.socialMetrics?.metric ?? "Count";

  const columns = useMemo<ColumnDef<SocialMetricsRewardTier>[]>(
    () => [
      {
        id: "threshold",
        header: capitalize(metricLabel)!,
        minSize: 100,
        size: 120,
        cell: ({ row: { original } }) => {
          const progress =
            (submission.socialMetricCount ?? 0) / original.threshold;

          return (
            <div className="flex items-center gap-2">
              <ProgressCircle progress={progress} />
              <span className="font-medium text-neutral-800">
                {original.threshold.toLocaleString()}
              </span>
            </div>
          );
        },
      },
      {
        id: "reward",
        header: "Reward",
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
          const status =
            displayStatusMap[getDisplayStatus(original, submission)];

          return (
            <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
          );
        },
      },
    ],
    [metricLabel, submission],
  );

  const table = useTable({
    data: tiers,
    columns,
    getRowId: (row) => String(row.threshold),
    resourceName: () => "reward tier",
    scrollWrapperClassName: "min-h-0",
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tbody_tr:last-child_td]:border-b-0",
  });

  if (tiers.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-neutral-900">Rewards</h2>
      <div className="mt-3">
        <Table {...table} />
      </div>
    </div>
  );
}
