"use client";

import { getGroupRewardsAndDiscount } from "@/lib/partners/get-group-rewards-and-discount";
import useGroup from "@/lib/swr/use-group";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { LoadingSpinner } from "@dub/ui";

export function RewardsDiscountsPreview() {
  const { group } = useGroup({ groupIdOrSlug: DEFAULT_PARTNER_GROUP.slug });

  if (!group)
    return (
      <div className="flex h-[117px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  const { rewards, discount } = getGroupRewardsAndDiscount(group);

  return <LanderRewards rewards={rewards} discount={discount} />;
}
