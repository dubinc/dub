import { useDiscounts } from "@/lib/swr/use-discounts";
import { useRewards } from "@/lib/swr/use-rewards";
import {
  DiscountProps,
  EnrolledPartnerProps,
  GroupProps,
  RewardProps,
} from "@/lib/types";
import { useMemo } from "react";

export type PartnerRewardItem = RewardProps & {
  isOverride: boolean;
};

export type PartnerDiscountItem = DiscountProps & {
  isOverride: boolean;
};

type RewardEvent = "click" | "lead" | "sale";

const rewardConfig: {
  event: RewardEvent;
  partnerKey: keyof Pick<
    EnrolledPartnerProps,
    "clickRewardId" | "leadRewardId" | "saleRewardId"
  >;
  groupKey: "clickReward" | "leadReward" | "saleReward";
}[] = [
  {
    event: "click",
    partnerKey: "clickRewardId",
    groupKey: "clickReward",
  },
  {
    event: "lead",
    partnerKey: "leadRewardId",
    groupKey: "leadReward",
  },
  {
    event: "sale",
    partnerKey: "saleRewardId",
    groupKey: "saleReward",
  },
];

// Resolves a partner's effective rewards and discount: partner-level overrides
// when set, otherwise the group's defaults. Marks each item with `isOverride`.
export function usePartnerRewards({
  partner,
  group,
}: {
  partner:
    | Pick<
        EnrolledPartnerProps,
        "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
      >
    | null
    | undefined;
  group: GroupProps | null | undefined;
}) {
  const { rewards: groupRewards } = useRewards({
    groupId: group?.id,
  });

  const { discounts: groupDiscounts } = useDiscounts({
    groupId: group?.id,
  });

  return useMemo(() => {
    const rewards: PartnerRewardItem[] = [];
    let discount: PartnerDiscountItem | null = null;

    if (!group) {
      return {
        rewards,
        discount,
      };
    }

    const rewardsById = new Map(
      (groupRewards ?? []).map((reward) => [reward.id, reward]),
    );

    const discountsById = new Map(
      (groupDiscounts ?? []).map((discount) => [discount.id, discount]),
    );

    for (const { partnerKey, groupKey } of rewardConfig) {
      const partnerRewardId = partner?.[partnerKey];
      const groupReward = group[groupKey];

      if (partnerRewardId) {
        const reward = rewardsById.get(partnerRewardId);

        if (reward) {
          rewards.push({
            ...reward,
            isOverride: partnerRewardId !== groupReward?.id,
          });
        }
      } else if (groupReward) {
        rewards.push({
          ...groupReward,
          isOverride: false,
        });
      }
    }

    if (group.referralReward) {
      rewards.push({
        ...group.referralReward,
        isOverride: false,
      });
    }

    if (group.customReward) {
      rewards.push({
        ...group.customReward,
        isOverride: false,
      });
    }

    if (partner?.discountId) {
      const resolvedDiscount = discountsById.get(partner.discountId);

      if (resolvedDiscount) {
        discount = {
          ...resolvedDiscount,
          isOverride: partner.discountId !== group.discount?.id,
        };
      }
    } else if (group.discount) {
      discount = {
        ...group.discount,
        isOverride: false,
      };
    }

    return {
      rewards,
      discount,
    };
  }, [group, partner, groupRewards, groupDiscounts]);
}
