import { GroupProps, RewardProps } from "@/lib/types";
import { sortRewardsByEventOrder } from "./sort-rewards-by-event-order";

/**
 * Determines the rewards and discount for the partner group
 */
export function getGroupRewardsAndDiscount(
  group: Pick<
    GroupProps,
    "clickReward" | "saleReward" | "leadReward" | "discount"
  >,
) {
  const rewards = sortRewardsByEventOrder(
    [
      group.clickReward ?? null,
      group.saleReward ?? null,
      group.leadReward ?? null,
    ].filter((r): r is RewardProps => r !== null),
  );

  return { rewards, discount: group.discount ?? null };
}
