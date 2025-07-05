import { DiscountProps, RewardProps } from "@/lib/types";
import { Prisma } from "@prisma/client";
import { programLanderSchema } from "../zod/schemas/program-lander";
import { sortRewardsByEventOrder } from "./sort-rewards-by-event-order";

// TODO: Add an alternative to this function that doesn't require fetching all rewards and discounts

/**
 * Determines the rewards and discount for a partner that submitted an application, based on any overrides in the lander data.
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
    rewards: sortRewardsByEventOrder(rewards.filter((r) => r.default)),
    discount: discounts.find((d) => d.default) || null,
  };

  const parsedLanderData = programLanderSchema.nullish().parse(landerData);
  if (!parsedLanderData?.rewards) return defaults;

  const landerRewards = parsedLanderData.rewards;
  const result: {
    rewards: RewardProps[];
    discount: DiscountProps | null;
  } = { rewards: [], discount: defaults.discount };

  if (landerRewards.discountId)
    result.discount =
      landerRewards.discountId === "none"
        ? null
        : discounts.find((d) => d.id === landerRewards.discountId) ||
          defaults.discount;

  (["sale", "lead", "click"] as const).forEach((event) => {
    const landerReward = landerRewards[`${event}RewardId`];
    const defaultReward = defaults.rewards.find((r) => r.event === event);

    // If no reward is set for the lander, use the default reward for this event
    if (!landerReward) {
      if (defaultReward) result.rewards.push(defaultReward);
      return;
    }

    if (landerReward === "none") return;

    // Still fall back to the default reward if there is no matching reward
    const reward =
      rewards.find((r) => r.id === landerReward && r.event === event) ||
      defaultReward;
    if (!reward) return;

    result.rewards.push(reward);
  });

  return result;
}
