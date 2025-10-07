import { CursorRays, Gift, InvoiceDollar, UserPlus } from "@dub/ui/icons";
import React from "react";

interface RewardItem {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

interface PartnerRewardsTooltipProps {
  rewards?: Array<{
    type: "click" | "lead" | "sale";
    iconType: "CursorRays" | "UserPlus" | "InvoiceDollar";
    text: string;
    reward: any;
  }>;
  discount?: { text: string };
}

const iconMap = {
  CursorRays,
  UserPlus,
  InvoiceDollar,
} as const;

export function PartnerRewardsTooltip({
  rewards = [],
  discount,
}: PartnerRewardsTooltipProps) {
  // Default rewards if none provided (based on Figma design)
  const defaultRewards: RewardItem[] = [
    {
      icon: InvoiceDollar,
      text: "Up to 60% per sale for 1 year",
    },
    {
      icon: UserPlus,
      text: "$5 per lead",
    },
    {
      icon: CursorRays,
      text: "$0.25 per click",
    },
  ];

  // Convert API rewards to component rewards
  const convertedRewards: RewardItem[] = rewards.map((reward) => ({
    icon: iconMap[reward.iconType],
    text: reward.text,
  }));

  const displayRewards =
    convertedRewards.length > 0 ? convertedRewards : defaultRewards;

  // Add discount if provided
  const allItems = discount
    ? [...displayRewards, { icon: Gift, text: discount.text }]
    : displayRewards;

  return (
    <div className="flex flex-col gap-1 p-2.5">
      {allItems.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <div key={index} className="flex w-full items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-neutral-100">
              <IconComponent className="size-4" />
            </div>
            <div className="text-xs font-medium leading-4 text-neutral-700">
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
