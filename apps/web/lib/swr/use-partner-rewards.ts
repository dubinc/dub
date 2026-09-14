import { useDiscounts } from "@/lib/swr/use-discounts";
import { useRewards } from "@/lib/swr/use-rewards";
import {
  DiscountProps,
  EnrolledPartnerProps,
  GroupProps,
  RewardProps,
} from "@/lib/types";
import { groupBy } from "@dub/utils";
import { useMemo } from "react";

export type PartnerRewardItem = RewardProps & {
  isOverride: boolean;
};

export type PartnerDiscountItem = DiscountProps & {
  isOverride: boolean;
};

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

    if (!group || !groupRewards || !groupDiscounts) {
      return {
        rewards,
        discount,
      };
    }

    const rewardsById = groupBy(groupRewards, ({ id }) => id);
    const discountsById = groupBy(groupDiscounts, ({ id }) => id);

    if (partner?.clickRewardId) {
      const isOverride = Boolean(
        partner.clickRewardId !== group.clickReward?.id,
      );
      const reward = rewardsById[partner.clickRewardId]?.[0];

      if (reward) {
        rewards.push({
          ...reward,
          isOverride,
        });
      }
    }

    if (partner?.leadRewardId) {
      const isOverride = Boolean(partner.leadRewardId !== group.leadReward?.id);
      const reward = rewardsById[partner.leadRewardId]?.[0];

      if (reward) {
        rewards.push({
          ...reward,
          isOverride,
        });
      }
    }

    if (partner?.saleRewardId) {
      const isOverride = Boolean(partner.saleRewardId !== group.saleReward?.id);
      const reward = rewardsById[partner.saleRewardId]?.[0];

      if (reward) {
        rewards.push({
          ...reward,
          isOverride,
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
      const isOverride = Boolean(partner.discountId !== group.discount?.id);
      const effectiveDiscount = discountsById[partner.discountId]?.[0];

      if (effectiveDiscount) {
        discount = {
          ...effectiveDiscount,
          isOverride,
        };
      }
    }

    return {
      rewards,
      discount,
    };
  }, [group, partner, groupRewards, groupDiscounts]);
}
