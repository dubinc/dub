import "server-only";

import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { DiscountProps } from "@/lib/types";
import { Discount, Reward } from "@prisma/client";

export type LinkRewardWithOptionalRewards = {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
  discount?: Discount | null;
};

export function getResolvedPartnerLinkRewards({
  linkReward,
  enrollmentRewards,
  enrollmentDiscount,
}: {
  linkReward: LinkRewardWithOptionalRewards | null | undefined;
  enrollmentRewards: Array<Reward | null | undefined>;
  enrollmentDiscount: Discount | DiscountProps | null | undefined;
}) {
  return {
    clickReward: serializeNullableReward(
      linkReward?.clickReward ??
        enrollmentRewards.find((reward) => reward?.event === "click"),
    ),
    leadReward: serializeNullableReward(
      linkReward?.leadReward ??
        enrollmentRewards.find((reward) => reward?.event === "lead"),
    ),
    saleReward: serializeNullableReward(
      linkReward?.saleReward ??
        enrollmentRewards.find((reward) => reward?.event === "sale"),
    ),
    discount: linkReward?.discount ?? enrollmentDiscount ?? null,
  };
}

function serializeNullableReward(reward: Reward | null | undefined) {
  return reward ? serializeReward(reward) : null;
}
