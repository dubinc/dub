import { currencyFormatter } from "@dub/utils";
import { BountyProps } from "../types";
import { resolveBountyDetails } from "./utils";

export function getBountyRewardDescription(
  bounty: Pick<BountyProps, "rewardAmount" | "rewardDescription"> & {
    submissionRequirements?: BountyProps["submissionRequirements"];
  },
) {
  const bountyInfo = resolveBountyDetails({
    rewardAmount: bounty.rewardAmount,
    submissionRequirements: bounty.submissionRequirements ?? null,
  });

  const incrementalBonus = bountyInfo?.socialMetrics?.incrementalBonus;

  if (
    incrementalBonus?.incrementCount &&
    incrementalBonus?.bonusPerIncrement != null &&
    incrementalBonus?.maxCount
  ) {
    const baseRewardCents = bounty.rewardAmount ?? 0;

    const incrementalCapCents =
      Math.floor(incrementalBonus.maxCount / incrementalBonus.incrementCount) *
      incrementalBonus.bonusPerIncrement;

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
