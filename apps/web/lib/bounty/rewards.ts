import { currencyFormatter } from "@dub/utils";
import { BountyProps } from "../types";
import { resolveBountyDetails } from "./utils";

type BountyRewardFields = Pick<
  BountyProps,
  "rewardAmount" | "rewardDescription" | "submissionRequirements"
>;

// the reward in cents, and whether it is a maximum (bounties with an incremental bonus pay up to that amount)
export function getBountyRewardAmount(
  bounty: BountyRewardFields,
): { amount: number; isMaximum: boolean } | null {
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

    const incrementalCapCents =
      Math.max(
        0,
        Math.floor(
          (incrementalBonus.maxCount - minCount) /
            incrementalBonus.incrementCount,
        ),
      ) * incrementalBonus.bonusPerIncrement;

    const earningsCapCents = baseRewardCents + incrementalCapCents;

    if (earningsCapCents > 0) {
      return { amount: earningsCapCents, isMaximum: true };
    }
  }

  if (bounty.rewardAmount) {
    return { amount: bounty.rewardAmount, isMaximum: false };
  }

  return null;
}

export function getBountyRewardDescription(bounty: BountyRewardFields) {
  const reward = getBountyRewardAmount(bounty);

  if (reward) {
    const formattedAmount = currencyFormatter(reward.amount, {
      trailingZeroDisplay: "stripIfInteger",
    });

    return reward.isMaximum
      ? `Earn up to ${formattedAmount}`
      : `Earn ${formattedAmount}`;
  }

  if (bounty.rewardDescription) {
    return bounty.rewardDescription;
  }

  return "";
}
