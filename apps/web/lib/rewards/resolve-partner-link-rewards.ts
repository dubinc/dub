import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";

type RewardReference = string | RewardProps | null | undefined;
type DiscountReference = string | DiscountProps | null | undefined;

export type PartnerLinkRewardReferences = {
  clickReward?: RewardReference;
  leadReward?: RewardReference;
  saleReward?: RewardReference;
  discount?: DiscountReference;
};

function resolveExpandedReward(value: RewardReference): RewardProps | null {
  if (!value || typeof value === "string") {
    return null;
  }

  return value;
}

function resolveExpandedDiscount(
  value: DiscountReference,
): DiscountProps | null {
  if (!value || typeof value === "string") {
    return null;
  }

  return value;
}

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

export function resolvePartnerLinkRewards({
  link,
  enrollmentRewards,
  enrollmentDiscount,
}: {
  link: PartnerLinkRewardReferences | null | undefined;
  enrollmentRewards: RewardProps[];
  enrollmentDiscount: DiscountProps | null | undefined;
}): {
  clickReward: RewardProps | null;
  leadReward: RewardProps | null;
  saleReward: RewardProps | null;
  discount: DiscountProps | null;
  rewards: RewardProps[];
} {
  const rewardsByEvent = new Map(
    enrollmentRewards.map((reward) => [reward.event, reward]),
  );

  const clickReward = pickDisplayReward(
    resolveExpandedReward(link?.clickReward) ??
      rewardsByEvent.get("click") ??
      null,
  );
  const leadReward = pickDisplayReward(
    resolveExpandedReward(link?.leadReward) ??
      rewardsByEvent.get("lead") ??
      null,
  );
  const saleReward = pickDisplayReward(
    resolveExpandedReward(link?.saleReward) ??
      rewardsByEvent.get("sale") ??
      null,
  );

  const rewards = [
    clickReward,
    leadReward,
    saleReward,
    ...getDisplayCustomRewards(enrollmentRewards),
  ].filter((reward): reward is RewardProps => reward != null);

  return {
    clickReward,
    leadReward,
    saleReward,
    discount:
      resolveExpandedDiscount(link?.discount) ?? enrollmentDiscount ?? null,
    rewards,
  };
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
