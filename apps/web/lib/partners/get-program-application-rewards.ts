import { DiscountProps, RewardProps } from "@/lib/types";
import { Prisma } from "@prisma/client";
import { sortRewardsByEventOrder } from "./sort-rewards-by-event-order";

// TODO: Add an alternative to this function that doesn't require fetching all rewards and discounts

/**
 * Determines the rewards and discount for a partner that submitted an application.
 */
export function getProgramApplicationRewardsAndDiscount({
  rewards,
  discounts,
  landerData,
}: {
  /** Array of all of a program's rewards */
  rewards: RewardProps[];
  /** Array of all of a program's discounts */
  discounts: DiscountProps[];
  /** Lander data */
  landerData: Prisma.JsonValue;
}) {
  const defaults = {
    rewards: sortRewardsByEventOrder(rewards.filter((r) => true)),
    discount: discounts.find((d) => true) || null,
  };

  const result: {
    rewards: RewardProps[];
    discount: DiscountProps | null;
  } = { rewards: [], discount: defaults.discount };

  (["sale", "lead", "click"] as const).forEach((event) => {
    const defaultReward = defaults.rewards.find((r) => r.event === event);

    if (defaultReward) result.rewards.push(defaultReward);
  });

  return result;
}
