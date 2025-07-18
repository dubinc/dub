"use client";

import { getProgramApplicationRewardsAndDiscount } from "@/lib/partners/get-program-application-rewards";
import useDiscounts from "@/lib/swr/use-discounts";
import useRewards from "@/lib/swr/use-rewards";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { LoadingSpinner } from "@dub/ui";
import { useWatch } from "react-hook-form";
import { useBrandingFormContext } from "./branding-form";

export function RewardsDiscountsPreview() {
  const { getValues } = useBrandingFormContext();
  const { landerData } = {
    ...useWatch(),
    ...getValues(),
  };

  const { rewards, loading: rewardsLoading } = useRewards();
  const { discounts, loading: discountsLoading } = useDiscounts();

  if (rewardsLoading || discountsLoading)
    return (
      <div className="flex h-[117px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  const result = getProgramApplicationRewardsAndDiscount({
    rewards: rewards || [],
    discounts: discounts || [],
    landerData,
  });

  return <LanderRewards rewards={result.rewards} discount={result.discount} />;
}
