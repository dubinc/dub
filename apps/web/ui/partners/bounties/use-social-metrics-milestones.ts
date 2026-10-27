import {
  getPendingSocialMetricsMilestones,
  getSocialMetricsEarningCap,
  getSocialMetricsMilestones,
  hasReachedSocialMetricsEarningCap,
  SubmissionMilestoneInput,
} from "@/lib/bounty/social-metrics-milestones";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { BountyProps } from "@/lib/types";

export function useSocialMetricsMilestones({
  bounty,
  submission,
}: {
  bounty:
    | Pick<BountyProps, "submissionRequirements" | "rewardAmount">
    | null
    | undefined;
  submission: SubmissionMilestoneInput | null | undefined;
}) {
  const metric = resolveBountyDetails(bounty)?.socialMetrics?.metric ?? null;
  const isSocialMetricsBounty = metric != null;

  const pendingMilestones =
    isSocialMetricsBounty && submission
      ? getPendingSocialMetricsMilestones({ bounty, submission })
      : [];

  const pendingRewardAmount = pendingMilestones.reduce(
    (total, { rewardAmount }) => total + rewardAmount,
    0,
  );

  const hasMultipleMilestones =
    isSocialMetricsBounty && getSocialMetricsMilestones(bounty).length > 1;

  const earningCap = getSocialMetricsEarningCap(bounty);
  const lastPendingMilestone = pendingMilestones[pendingMilestones.length - 1];

  const completesEarningCap =
    earningCap != null &&
    lastPendingMilestone != null &&
    lastPendingMilestone.threshold >= earningCap;

  const hasReachedEarningCap =
    isSocialMetricsBounty &&
    submission != null &&
    hasReachedSocialMetricsEarningCap({ bounty, submission });

  return {
    metric,
    isSocialMetricsBounty,
    hasMultipleMilestones,
    pendingMilestones,
    pendingRewardAmount,
    completesEarningCap,
    hasReachedEarningCap,
  };
}
