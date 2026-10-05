import { nFormatter } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { BountySubmissionProps } from "../types";
import { resolveBountyDetails } from "./utils";

interface BountyInfoInput {
  submissionRequirements?: Prisma.JsonValue | undefined | null;
  rewardAmount?: number | undefined | null;
}

interface SocialMetricsMilestone {
  fromThreshold: number; // metric count where this milestone starts (0 for the base milestone, otherwise the previous threshold)
  threshold: number; // metric count the partner must reach to earn this milestone
  rewardAmount: number; // payout in cents for this milestone (base reward for the first, bonusPerIncrement for the rest)
}

export interface SocialMetricsMilestoneRow extends SocialMetricsMilestone {
  reached: boolean;
}

export type SocialMetricsMilestoneStatus =
  | "approved"
  | "pending"
  | "inProgress"
  | "rejected";

export type SubmissionMilestoneInput = Pick<
  BountySubmissionProps,
  "socialMetricCount" | "approvedSocialMetricThreshold"
>;

// All payable milestones for a social metrics bounty (base reward + bonus increments), in ascending order
export function getSocialMetricsMilestones(
  bounty: BountyInfoInput | undefined | null,
): SocialMetricsMilestone[] {
  const bountyInfo = resolveBountyDetails(bounty);
  const socialMetrics = bountyInfo?.socialMetrics;
  const rewardAmount = bounty?.rewardAmount ?? 0;

  if (!socialMetrics?.metric || !socialMetrics.minCount || rewardAmount <= 0) {
    return [];
  }

  const { minCount, incrementalBonus } = socialMetrics;

  // Base tier
  const milestones: SocialMetricsMilestone[] = [
    {
      fromThreshold: 0,
      threshold: minCount,
      rewardAmount,
    },
  ];

  // Incremental bonus tiers
  if (incrementalBonus) {
    const { incrementCount, bonusPerIncrement, maxCount } = incrementalBonus;

    const hasValidIncrementalBonus =
      incrementCount != null &&
      bonusPerIncrement != null &&
      maxCount != null &&
      incrementCount > 0;

    if (hasValidIncrementalBonus) {
      for (
        let t = minCount + incrementCount;
        t <= maxCount;
        t += incrementCount
      ) {
        milestones.push({
          fromThreshold: t - incrementCount,
          threshold: t,
          rewardAmount: bonusPerIncrement,
        });
      }
    }
  }

  return milestones;
}

// Highest metric count that still earns a reward (last milestone threshold), or null for non-social bounties
export function getSocialMetricsEarningCap(
  bounty: BountyInfoInput | undefined | null,
) {
  const milestones = getSocialMetricsMilestones(bounty);

  return milestones.length > 0
    ? milestones[milestones.length - 1].threshold
    : null;
}

// Whether the submission's live metric count has reached the earning cap (no further syncing needed)
export function hasReachedSocialMetricsEarningCap({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<BountySubmissionProps, "socialMetricCount">;
}) {
  const earningCap = getSocialMetricsEarningCap(bounty);

  if (earningCap == null || submission.socialMetricCount == null) {
    return false;
  }

  return submission.socialMetricCount >= earningCap;
}

// Reached milestones above approvedSocialMetricThreshold, i.e. the ones awaiting approval and payout
export function getPendingSocialMetricsMilestones({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: SubmissionMilestoneInput;
}) {
  const socialMetricCount = submission.socialMetricCount ?? 0;
  const approvedThreshold = submission.approvedSocialMetricThreshold ?? 0;

  return getSocialMetricsMilestones(bounty).filter(
    ({ threshold }) =>
      threshold <= socialMetricCount && threshold > approvedThreshold,
  );
}

// Whether a milestone has been paid; legacy approved submissions (null threshold) count every reached milestone as paid
export function isSocialMetricsMilestoneApproved({
  milestone,
  submission,
}: {
  milestone: Pick<SocialMetricsMilestone, "threshold">;
  submission: SubmissionMilestoneInput & Pick<BountySubmissionProps, "status">;
}) {
  if (submission.approvedSocialMetricThreshold != null) {
    return milestone.threshold <= submission.approvedSocialMetricThreshold;
  }

  return (
    submission.status === "approved" &&
    milestone.threshold <= (submission.socialMetricCount ?? 0)
  );
}

// Commission description for a milestone payout, e.g. `Commission for growing from 1,000 to 2,000 views on "June launch" bounty.`
export function buildMilestonesCommissionDescription({
  bountyName,
  metric,
  milestone,
}: {
  bountyName: string | null;
  metric: string;
  milestone: Pick<SocialMetricsMilestone, "fromThreshold" | "threshold">;
}) {
  const from = nFormatter(milestone.fromThreshold, { full: true });
  const to = `${nFormatter(milestone.threshold, { full: true })} ${metric}`;
  const bountyLabel = bountyName ? `"${bountyName}" bounty` : "the bounty";

  if (milestone.fromThreshold === 0) {
    return `Commission for reaching ${to} on ${bountyLabel}.`;
  }

  return `Commission for growing from ${from} to ${to} on ${bountyLabel}.`;
}

// Merges consecutive milestones with the same reward into ranges (base milestone always stays on its own)
export function groupSocialMetricsMilestones(
  milestones: SocialMetricsMilestone[],
) {
  const groups: (SocialMetricsMilestone & {
    count: number;
    totalRewardAmount: number;
  })[] = [];

  for (const milestone of milestones) {
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      lastGroup.fromThreshold !== 0 &&
      lastGroup.rewardAmount === milestone.rewardAmount &&
      lastGroup.threshold === milestone.fromThreshold
    ) {
      lastGroup.threshold = milestone.threshold;
      lastGroup.count += 1;
      lastGroup.totalRewardAmount += milestone.rewardAmount;
    } else {
      groups.push({
        ...milestone,
        count: 1,
        totalRewardAmount: milestone.rewardAmount,
      });
    }
  }

  return groups;
}

// Display status for a milestone row in the rewards table (approved, pending, in progress, or rejected)
export function getSocialMetricsMilestoneStatus({
  milestone,
  submission,
}: {
  milestone: SocialMetricsMilestoneRow;
  submission: SubmissionMilestoneInput & Pick<BountySubmissionProps, "status">;
}): SocialMetricsMilestoneStatus {
  if (isSocialMetricsMilestoneApproved({ milestone, submission })) {
    return "approved";
  }

  if (!milestone.reached) {
    return "inProgress";
  }

  if (submission.status === "rejected") {
    return "rejected";
  }

  return "pending";
}

// Milestones to show in the rewards table: every reached milestone plus the next unreached one
export function getVisibleSocialMetricsMilestones({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<BountySubmissionProps, "socialMetricCount"> &
    Partial<Pick<BountySubmissionProps, "approvedSocialMetricThreshold">>;
}): SocialMetricsMilestoneRow[] {
  const effectiveCount = Math.max(
    submission.socialMetricCount ?? 0,
    submission.approvedSocialMetricThreshold ?? 0,
  );

  const rows: SocialMetricsMilestoneRow[] = [];

  for (const milestone of getSocialMetricsMilestones(bounty)) {
    const reached = effectiveCount >= milestone.threshold;

    rows.push({ ...milestone, reached });

    // Stop after first unmet
    if (!reached) {
      break;
    }
  }

  return rows;
}

// Total earnings across all reached milestones, or null if the bounty has no social metrics or the count isn't synced yet
export function calculateSocialMetricsRewardAmount({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<BountySubmissionProps, "socialMetricCount">;
}) {
  const milestones = getVisibleSocialMetricsMilestones({ bounty, submission });

  if (milestones.length === 0 || submission.socialMetricCount == null) {
    return null;
  }

  return milestones
    .filter(({ reached }) => reached)
    .reduce((sum, { rewardAmount }) => sum + rewardAmount, 0);
}
