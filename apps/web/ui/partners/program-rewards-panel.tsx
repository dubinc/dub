"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { Gift, Tooltip } from "@dub/ui";
import { HelpCircle } from "lucide-react";
import { memo } from "react";
import { REWARD_EVENTS } from "./constants";
import { formatDiscountDescription } from "./format-discount-description";
import { ProgramRewardModifiersTooltipContent } from "./program-reward-modifiers-tooltip";

interface ProgramRewardsPanelProps {
  rewards: RewardProps[];
  discount?: DiscountProps | null;
}

// Custom tooltip with smaller icon
function CustomRewardModifiersTooltip({ reward }: { reward: RewardProps }) {
  return (
    <div className="inline-block align-text-top">
      <Tooltip
        content={<ProgramRewardModifiersTooltipContent reward={reward} />}
      >
        <HelpCircle className="h-3.5 w-3.5 translate-y-px text-neutral-400" />
      </Tooltip>
    </div>
  );
}

export const ProgramRewardsPanel = memo(
  ({ rewards, discount }: ProgramRewardsPanelProps) => {
    const sortedFilteredRewards = rewards.filter(
      (r) => getRewardAmount(r) >= 0,
    );

    const rewardItems = [
      ...sortedFilteredRewards.map((reward) => ({
        icon: REWARD_EVENTS[reward.event].icon,
        label: reward.description || (
          <>
            {constructRewardAmount(reward)}{" "}
            {reward.event === "sale" && reward.maxDuration === 0 ? (
              <>for the first sale</>
            ) : (
              <>per {reward.event}</>
            )}
            {reward.maxDuration === null ? (
              <>
                {" "}
                for the{" "}
                <strong className="font-semibold">customer's lifetime</strong>
              </>
            ) : reward.maxDuration && reward.maxDuration > 1 ? (
              <>
                {" "}
                for{" "}
                <strong className="font-semibold">
                  {reward.maxDuration % 12 === 0
                    ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
                    : `${reward.maxDuration} months`}
                </strong>
              </>
            ) : null}
            {!!reward.modifiers?.length && (
              <>
                {" "}
                <CustomRewardModifiersTooltip reward={reward} />
              </>
            )}
          </>
        ),
      })),
      ...(discount
        ? [
            {
              icon: Gift,
              label: formatDiscountDescription(discount),
            },
          ]
        : []),
    ];

    if (rewardItems.length === 0) return null;

    return (
      <div className="grid grid-cols-1">
        {rewardItems.map(({ icon: Icon, label }, index) => (
          <div
            key={index}
            className="text-content-default flex items-start gap-2 rounded-md py-1.5 text-sm"
          >
            <Icon className="size-4 shrink-0 translate-y-px" />
            <div>{label}</div>
          </div>
        ))}
      </div>
    );
  },
);

ProgramRewardsPanel.displayName = "ProgramRewardsPanel";
