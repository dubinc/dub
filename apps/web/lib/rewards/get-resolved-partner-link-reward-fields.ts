import "server-only";

import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { LinkRewardWithOptionalRewards } from "@/lib/api/rewards/additional-rewards";
import { resolvePartnerLinkRewards } from "@/lib/rewards/resolve-partner-link-rewards";
import { DiscountProps } from "@/lib/types";
import { Discount, Reward } from "@prisma/client";

export function getResolvedPartnerLinkRewards({
  linkReward,
  enrollmentRewards,
  enrollmentDiscount,
}: {
  linkReward: LinkRewardWithOptionalRewards | null | undefined;
  enrollmentRewards: Array<Reward | null | undefined>;
  enrollmentDiscount: Discount | DiscountProps | null | undefined;
}) {
  const { clickReward, leadReward, saleReward, discount } =
    resolvePartnerLinkRewards({
      link: {
        clickReward: serializeNullableReward(linkReward?.clickReward),
        leadReward: serializeNullableReward(linkReward?.leadReward),
        saleReward: serializeNullableReward(linkReward?.saleReward),
        discount: linkReward?.discount ?? null,
      },
      enrollmentRewards: enrollmentRewards.flatMap((reward) =>
        reward ? [serializeReward(reward)] : [],
      ),
      enrollmentDiscount: enrollmentDiscount ?? null,
    });

  return {
    clickReward,
    leadReward,
    saleReward,
    discount,
  };
}

function serializeNullableReward(reward: Reward | null | undefined) {
  return reward ? serializeReward(reward) : null;
}
