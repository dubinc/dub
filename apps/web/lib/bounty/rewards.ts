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

// "$50" or "Up to $300", and with a prefix, "Earn $50" or "Earn up to $300"
export function formatBountyRewardAmount(
  reward: { amount: number; isMaximum: boolean },
  { prefix }: { prefix?: string } = {},
) {
  const formattedAmount = currencyFormatter(reward.amount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const text = [prefix, reward.isMaximum && "up to", formattedAmount]
    .filter(Boolean)
    .join(" ");

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getBountyRewardDescription(bounty: BountyRewardFields) {
  const reward = getBountyRewardAmount(bounty);

  if (reward) {
    return formatBountyRewardAmount(reward, { prefix: "Earn" });
  }

  if (bounty.rewardDescription) {
    return bounty.rewardDescription;
  }

  return "";
}
