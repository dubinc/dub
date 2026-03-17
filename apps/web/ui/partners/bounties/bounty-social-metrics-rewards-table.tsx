"use client";

import {
  getSocialMetricsRewardTiers,
  SocialMetricsRewardTier,
} from "@/lib/bounty/rewards";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import { StatusBadge, Table, useTable } from "@dub/ui";
import { capitalize, currencyFormatter } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

const displayStatusMap = {
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
  draft: {
    label: "Draft",
    variant: "pending",
  },
  rejected: {
    label: "Rejected",
    variant: "error",
  },
};

interface SubmissionForRewards {
  socialMetricCount: number | null;
  commission: { earnings: number } | null;
  status: BountySubmissionProps["status"];
}

function getDisplayStatus(
  tier: SocialMetricsRewardTier,
  submission: SubmissionForRewards,
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

  if (submission.status === "draft") {
    return "draft";
  }

  if (submission.status === "rejected") {
    return "rejected";
  }

  return "pending";
}

export function BountySocialMetricsRewardsTable({
  bounty,
  submission,
  titleText = "Rewards",
}: {
  bounty: Pick<
    PartnerBountyProps,
    "id" | "submissionRequirements" | "rewardAmount"
  >;
  submission: SubmissionForRewards;
  titleText?: string;
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
      <h2 className="text-content-emphasis text-base font-semibold">
        {titleText}
      </h2>
      <div className="mt-3">
        <Table {...table} />
      </div>
    </div>
  );
}
