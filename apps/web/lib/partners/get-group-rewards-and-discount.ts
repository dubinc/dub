import { GroupProps, RewardProps } from "@/lib/types";
import { Reward } from "@prisma/client";

/**
 * Accepts both Prisma 'Reward' (database) and 'RewardProps' (frontend).
 *
 * Why we use two types:
 * - When reading directly from the database (via Prisma), reward fields like
 *   `amountInPercentage` can be `Prisma.Decimal`, which is **not JSON-serializable**.
 * - When the data is already processed or passed around in the app, it may
 *   already be in the normalized `RewardProps` format.
 */
type GetGroupRewardsAndDiscountProps =
  | Pick<GroupProps, "clickReward" | "saleReward" | "leadReward" | "discount">
  | {
      clickReward?: Reward | RewardProps | null;
      saleReward?: Reward | RewardProps | null;
      leadReward?: Reward | RewardProps | null;
      discount?: GroupProps["discount"];
    };

// Determines the rewards and discount for the partner group
export function getGroupRewardsAndDiscount({
  clickReward,
  saleReward,
  leadReward,
  discount,
}: GetGroupRewardsAndDiscountProps) {
  const normalizedRewards: RewardProps[] = [
    clickReward ? serializeReward(clickReward) : null,
    saleReward ? serializeReward(saleReward) : null,
    leadReward ? serializeReward(leadReward) : null,
  ].filter((r): r is RewardProps => r !== null);

  return {
    rewards: normalizedRewards,
    discount: discount ?? null,
  };
}

export function serializeReward(
  reward: Reward | RewardProps | null | undefined,
): RewardProps | null {
  if (!reward) return null;

  return {
    ...reward,
    amountInPercentage: reward.amountInPercentage
      ? Number(reward.amountInPercentage)
      : null,
  };
}
