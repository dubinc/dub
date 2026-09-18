import { resolvePartnerAssignedItem } from "@/lib/rewards/resolve-partner-assigned-item";
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
  const { rewards: groupRewards, loading: rewardsLoading } = useRewards({
    groupId: group?.id,
  });

  const { discounts: groupDiscounts, loading: discountsLoading } = useDiscounts(
    {
      groupId: group?.id,
    },
  );

  return useMemo(() => {
    const rewards: PartnerRewardItem[] = [];
    let discount: PartnerDiscountItem | null = null;

    if (!group) {
      return {
        rewards,
        discount,
      };
    }

    const rewardsById = new Map<string, RewardProps>(
      (groupRewards ?? []).map((reward) => [reward.id, reward]),
    );

    const discountsById = new Map<string, DiscountProps>(
      (groupDiscounts ?? []).map((discount) => [discount.id, discount]),
    );

    for (const { partnerKey, groupKey } of rewardConfig) {
      const resolved = resolvePartnerAssignedItem({
        assignedId: partner?.[partnerKey],
        groupDefault: group[groupKey],
        itemsById: rewardsById,
        loading: rewardsLoading,
      });

      if (resolved) {
        rewards.push({
          ...resolved.item,
          isOverride: resolved.isOverride,
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

    const resolvedDiscount = resolvePartnerAssignedItem({
      assignedId: partner?.discountId,
      groupDefault: group.discount,
      itemsById: discountsById,
      loading: discountsLoading,
    });

    if (resolvedDiscount) {
      discount = {
        ...resolvedDiscount.item,
        isOverride: resolvedDiscount.isOverride,
      };
    }

    return {
      rewards,
      discount,
    };
  }, [
    group,
    partner,
    groupRewards,
    groupDiscounts,
    rewardsLoading,
    discountsLoading,
  ]);
}
