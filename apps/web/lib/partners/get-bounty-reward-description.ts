import { currencyFormatter } from "@dub/utils";
import { BountyProps } from "../types";

export function getBountyRewardDescription(
  bounty: Pick<BountyProps, "rewardAmount" | "rewardDescription">,
) {
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
