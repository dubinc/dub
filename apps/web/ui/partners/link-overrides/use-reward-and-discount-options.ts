import useDiscounts from "@/lib/swr/use-discounts";
import { useRewards } from "@/lib/swr/use-rewards";
import { GroupProps } from "@/lib/types";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { DiscountSelectorOption } from "@/ui/partners/link-overrides/discount-selector";
import { RewardSelectorOption } from "@/ui/partners/link-overrides/reward-selector";
import { useMemo } from "react";

export function useRewardAndDiscountOptions({
  group,
}: {
  group: GroupProps | undefined;
}) {
  const { rewards } = useRewards();
  const { discounts } = useDiscounts();

  return useMemo(() => {
    const clickRewards: RewardSelectorOption[] = [];
    const saleRewards: RewardSelectorOption[] = [];
    const leadRewards: RewardSelectorOption[] = [];

    const optionsByColumn = {
      [REWARD_EVENT_COLUMN_MAPPING.click]: clickRewards,
      [REWARD_EVENT_COLUMN_MAPPING.lead]: leadRewards,
      [REWARD_EVENT_COLUMN_MAPPING.sale]: saleRewards,
    };

    const groupRewardIds = {
      click: group?.clickReward?.id,
      lead: group?.leadReward?.id,
      sale: group?.saleReward?.id,
    };

    for (const reward of rewards ?? []) {
      if (!["click", "lead", "sale"].includes(reward.event)) {
        continue;
      }

      const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];
      const groupRewardId = groupRewardIds[reward.event];

      optionsByColumn[rewardIdColumn].push({
        value: reward.id,
        label: formatRewardDescription(reward),
        first: reward.id === groupRewardId,
        meta: { isGroup: reward.id === groupRewardId },
      });
    }

    const groupDiscountId = group?.discount?.id;
    const discountOptions: DiscountSelectorOption[] = (discounts ?? []).map(
      (discount) => ({
        value: discount.id,
        label: formatDiscountDescription(discount),
        first: discount.id === groupDiscountId,
        meta: { isGroup: discount.id === groupDiscountId },
      }),
    );

    return {
      clickRewards,
      saleRewards,
      leadRewards,
      discounts: discountOptions,
    };
  }, [
    rewards,
    discounts,
    group?.clickReward?.id,
    group?.leadReward?.id,
    group?.saleReward?.id,
    group?.discount?.id,
  ]);
}
