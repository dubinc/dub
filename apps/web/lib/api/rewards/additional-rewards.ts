import { Discount, LinkReward, Reward } from "@prisma/client";

export type LinkRewardIds = Pick<
  LinkReward,
  "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
>;

export type LinkRewardIdsInput = Partial<LinkRewardIds>;

export type LinkRewardWithOptionalRewards = LinkRewardIds & {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
  discount?: Discount | null;
};

// Group defaults are inherited; only persist real link-level overrides.
const omitGroupDefault = ({
  value,
  groupDefaultId,
}: {
  value: string | null | undefined;
  groupDefaultId: string | null | undefined;
}) => (value && value === groupDefaultId ? null : value);

export const omitGroupDefaultRewardIds = ({
  rewardIds,
  groupDefaults,
}: {
  rewardIds: LinkRewardIdsInput;
  groupDefaults: Partial<LinkRewardIds> | null | undefined;
}): LinkRewardIdsInput => ({
  clickRewardId:
    rewardIds.clickRewardId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.clickRewardId,
          groupDefaultId: groupDefaults?.clickRewardId,
        }),
  leadRewardId:
    rewardIds.leadRewardId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.leadRewardId,
          groupDefaultId: groupDefaults?.leadRewardId,
        }),
  saleRewardId:
    rewardIds.saleRewardId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.saleRewardId,
          groupDefaultId: groupDefaults?.saleRewardId,
        }),
  discountId:
    rewardIds.discountId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.discountId,
          groupDefaultId: groupDefaults?.discountId,
        }),
});

export const getRewardIds = (
  linkReward: LinkRewardIdsInput | null | undefined,
) => ({
  clickReward: linkReward?.clickRewardId ?? null,
  leadReward: linkReward?.leadRewardId ?? null,
  saleReward: linkReward?.saleRewardId ?? null,
  discount: linkReward?.discountId ?? null,
});
