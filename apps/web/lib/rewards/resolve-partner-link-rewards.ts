import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";

function pickDisplayReward(reward: RewardProps | null | undefined) {
  if (!reward || getRewardAmount(reward) < 0) {
    return null;
  }

  return reward;
}

function getDisplayCustomRewards(enrollmentRewards: RewardProps[]) {
  return enrollmentRewards.filter(
    (reward) => reward.event === "custom" && getRewardAmount(reward) >= 0,
  );
}

export function getPartnerLinkDisplayRewards({
  clickReward,
  leadReward,
  saleReward,
  discount,
  enrollmentRewards = [],
}: {
  clickReward?: RewardProps | null;
  leadReward?: RewardProps | null;
  saleReward?: RewardProps | null;
  discount?: DiscountProps | null;
  enrollmentRewards?: RewardProps[];
}) {
  return {
    rewards: [
      pickDisplayReward(saleReward),
      pickDisplayReward(leadReward),
      pickDisplayReward(clickReward),
      ...getDisplayCustomRewards(enrollmentRewards),
    ].filter((reward): reward is RewardProps => reward != null),
    discount: discount ?? null,
  };
}

const PRIMARY_REWARD_EVENTS = ["sale", "lead", "click"] as const;

export function getPartnerLinkPrimaryIncentive({
  rewards,
  discount,
}: {
  rewards: RewardProps[];
  discount: DiscountProps | null;
}): {
  primaryReward: RewardProps | null;
  primaryDiscount: DiscountProps | null;
  additionalCount: number;
} {
  const primaryReward =
    PRIMARY_REWARD_EVENTS.map((event) =>
      rewards.find((reward) => reward.event === event),
    ).find(Boolean) ??
    rewards[0] ??
    null;

  const primaryDiscount = primaryReward ? null : discount;
  const totalCount = rewards.length + (discount ? 1 : 0);
  const additionalCount = Math.max(0, totalCount - 1);

  return {
    primaryReward: primaryReward ?? null,
    primaryDiscount,
    additionalCount,
  };
}
