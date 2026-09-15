import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";

type RewardReference = string | RewardProps | null | undefined;
type DiscountReference = string | DiscountProps | null | undefined;

type LinkRewardReferences = {
  clickReward?: RewardReference;
  leadReward?: RewardReference;
  saleReward?: RewardReference;
  discount?: DiscountReference;
};

const OVERRIDE_EVENTS = ["click", "lead", "sale"] as const;

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

export function resolvePartnerLinkRewards({
  link,
  enrollmentRewards,
  enrollmentDiscount,
}: {
  link: LinkRewardReferences | null | undefined;
  enrollmentRewards: RewardProps[];
  enrollmentDiscount: DiscountProps | null | undefined;
}): {
  rewards: RewardProps[];
  discount: DiscountProps | null;
} {
  const rewardsByEvent = new Map(
    enrollmentRewards.map((reward) => [reward.event, reward]),
  );

  const resolvedRewards: RewardProps[] = [];

  for (const event of OVERRIDE_EVENTS) {
    const linkReward = resolveExpandedReward(
      {
        click: link?.clickReward,
        lead: link?.leadReward,
        sale: link?.saleReward,
      }[event],
    );

    const reward = linkReward ?? rewardsByEvent.get(event) ?? null;

    if (reward && getRewardAmount(reward) >= 0) {
      resolvedRewards.push(reward);
    }
  }

  for (const reward of enrollmentRewards) {
    if (reward.event === "custom" && getRewardAmount(reward) >= 0) {
      resolvedRewards.push(reward);
    }
  }

  const discount =
    resolveExpandedDiscount(link?.discount) ?? enrollmentDiscount ?? null;

  return {
    rewards: resolvedRewards,
    discount,
  };
}
