import { currencyFormatter } from "@dub/utils";
import { Prisma } from "@prisma/client";
import {
  BountyProps,
  BountySocialPlatform,
  BountySubmissionProps,
} from "../types";
import { resolveBountyDetails } from "./utils";

interface BountyInfoInput {
  submissionRequirements?: Prisma.JsonValue | undefined | null;
  rewardAmount?: number | undefined | null;
}

export interface SocialMetricsRewardTier {
  threshold: number;
  rewardAmount: number;
  status: "met" | "unmet";
  // Set for incremental-bonus tiers on multi-platform AND bounties, where
  // tiers are computed independently per required platform.
  platform?: BountySocialPlatform;
}

export function getSocialMetricsRewardTiers({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<
    BountySubmissionProps,
    "socialMetricCount" | "socialMetricResults"
  >;
}): SocialMetricsRewardTier[] {
  const bountyInfo = resolveBountyDetails(bounty);
  const socialMetrics = bountyInfo?.socialMetrics;
  const rewardAmount = bounty?.rewardAmount ?? 0;
  const socialMetricCount = submission.socialMetricCount ?? 0;

  if (!socialMetrics?.metric || !socialMetrics.minCount || rewardAmount <= 0) {
    return [];
  }

  const { minCount, incrementalBonus, logic } = socialMetrics;
  const platforms = bountyInfo?.socialPlatforms ?? [];
  const isAnd = logic === "AND" && platforms.length > 1;

  // Base tier — a single flat reward gated on the aggregate completion
  // (for AND, socialMetricCount is already the min across required platforms)
  const tiers: SocialMetricsRewardTier[] = [
    {
      threshold: minCount,
      rewardAmount,
      status: socialMetricCount >= minCount ? "met" : "unmet",
    },
  ];

  if (tiers[0].status === "unmet") {
    return tiers;
  }

  // Incremental bonus tiers
  if (!incrementalBonus) {
    return tiers;
  }

  const { incrementCount, bonusPerIncrement, maxCount } = incrementalBonus;

  const hasValidIncrementalBonus =
    incrementCount != null &&
    bonusPerIncrement != null &&
    maxCount != null &&
    incrementCount > 0;

  if (!hasValidIncrementalBonus) {
    return tiers;
  }

  if (!isAnd) {
    for (
      let t = minCount + incrementCount;
      t <= maxCount;
      t += incrementCount
    ) {
      const status = socialMetricCount >= t ? "met" : "unmet";

      tiers.push({
        threshold: t,
        rewardAmount: bonusPerIncrement,
        status,
      });

      // Stop after first unmet
      if (status === "unmet") {
        break;
      }
    }

    return tiers;
  }

  // AND: incremental tiers are computed independently per required platform
  // (same shared increment/bonus/cap config), then summed for the total reward.
  for (const platform of platforms) {
    const platformCount =
      submission.socialMetricResults?.find((r) => r.platform === platform.value)
        ?.metricCount ?? 0;

    for (
      let t = minCount + incrementCount;
      t <= maxCount;
      t += incrementCount
    ) {
      const status = platformCount >= t ? "met" : "unmet";

      tiers.push({
        threshold: t,
        rewardAmount: bonusPerIncrement,
        status,
        platform: platform.value,
      });

      // Stop after first unmet for this platform
      if (status === "unmet") {
        break;
      }
    }
  }

  return tiers;
}

export function calculateSocialMetricsRewardAmount({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<
    BountySubmissionProps,
    "socialMetricCount" | "socialMetricResults"
  >;
}) {
  const tiers = getSocialMetricsRewardTiers({ bounty, submission });

  if (tiers.length === 0 || submission.socialMetricCount == null) {
    return null;
  }

  return tiers
    .filter((tier) => tier.status === "met")
    .reduce((sum, tier) => sum + tier.rewardAmount, 0);
}

export function getBountyRewardDescription(
  bounty: Pick<
    BountyProps,
    "rewardAmount" | "rewardDescription" | "submissionRequirements"
  >,
) {
  const bountyInfo = resolveBountyDetails({
    rewardAmount: bounty.rewardAmount,
    submissionRequirements: bounty.submissionRequirements,
  });

  const socialMetrics = bountyInfo?.socialMetrics;
  const incrementalBonus = socialMetrics?.incrementalBonus;

  if (
    incrementalBonus?.incrementCount &&
    incrementalBonus?.bonusPerIncrement != null &&
    incrementalBonus?.maxCount
  ) {
    const baseRewardCents = bounty.rewardAmount ?? 0;
    const minCount = socialMetrics?.minCount ?? 0;

    const platformsCount = bountyInfo?.socialPlatforms.length ?? 1;
    const isAnd = socialMetrics?.logic === "AND" && platformsCount > 1;

    const incrementalCapCents =
      Math.max(
        0,
        Math.floor(
          (incrementalBonus.maxCount - minCount) /
            incrementalBonus.incrementCount,
        ),
      ) *
      incrementalBonus.bonusPerIncrement *
      // AND: the incremental bonus is computed per required platform and summed
      (isAnd ? platformsCount : 1);

    const earningsCapCents = baseRewardCents + incrementalCapCents;

    if (earningsCapCents > 0) {
      const formattedEarningsCap = currencyFormatter(earningsCapCents, {
        trailingZeroDisplay: "stripIfInteger",
      });

      return `Earn up to ${formattedEarningsCap}`;
    }
  }

  if (bounty.rewardAmount) {
    const formattedAmount = currencyFormatter(bounty.rewardAmount, {
      trailingZeroDisplay: "stripIfInteger",
    });

    return `Earn ${formattedAmount}`;
  }

  if (bounty.rewardDescription) {
    return bounty.rewardDescription;
  }

  return "";
}
