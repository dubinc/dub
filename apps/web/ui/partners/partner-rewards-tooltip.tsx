import { CursorRays, Gift, InvoiceDollar, UserPlus } from "@dub/ui/icons";
import React from "react";

interface PartnerRewardsTooltipProps {
  group?: {
    clickReward?: {
      amount: number;
      type: "percentage" | "flat";
      maxDuration?: number | null;
    } | null;
    leadReward?: {
      amount: number;
      type: "percentage" | "flat";
    } | null;
    saleReward?: {
      amount: number;
      type: "percentage" | "flat";
      maxDuration?: number | null;
    } | null;
    discount?: {
      amount: number;
      type: "percentage" | "flat";
      maxDuration?: number | null;
    } | null;
  } | null;
}

export function PartnerRewardsTooltip({ group }: PartnerRewardsTooltipProps) {
  if (!group) {
    return null; // Don't show tooltip if no group found
  }

  const rewards: Array<{
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }> = [];

  // Add click reward if exists
  if (group.clickReward) {
    const amount =
      group.clickReward.type === "percentage"
        ? `${group.clickReward.amount}%`
        : `$${(group.clickReward.amount / 100).toFixed(2)}`;
    rewards.push({
      icon: CursorRays,
      text: `${amount} per click`,
    });
  }

  // Add lead reward if exists
  if (group.leadReward) {
    const amount =
      group.leadReward.type === "percentage"
        ? `${group.leadReward.amount}%`
        : `$${(group.leadReward.amount / 100).toFixed(2)}`;
    rewards.push({
      icon: UserPlus,
      text: `${amount} per lead`,
    });
  }

  // Add sale reward if exists
  if (group.saleReward) {
    const amount =
      group.saleReward.type === "percentage"
        ? `${group.saleReward.amount}%`
        : `$${(group.saleReward.amount / 100).toFixed(2)}`;

    let durationText = "";
    const maxDuration = group.saleReward.maxDuration;
    if (maxDuration === null) {
      durationText = " for the customer's lifetime";
    } else if (maxDuration === 0) {
      durationText = " for the first sale";
    } else if (maxDuration && maxDuration > 1) {
      durationText =
        maxDuration % 12 === 0
          ? ` for ${maxDuration / 12} year${maxDuration / 12 > 1 ? "s" : ""}`
          : ` for ${maxDuration} month${maxDuration > 1 ? "s" : ""}`;
    }

    const prefix = group.saleReward.type === "percentage" ? "Up to " : "";
    rewards.push({
      icon: InvoiceDollar,
      text: `${prefix}${amount} per sale${durationText}`,
    });
  }

  // Add discount if exists
  if (group.discount) {
    const amount =
      group.discount.type === "percentage"
        ? `${group.discount.amount}%`
        : `$${(group.discount.amount / 100).toFixed(2)}`;

    let durationText = "";
    const maxDuration = group.discount.maxDuration;
    if (maxDuration === null) {
      durationText = " for their lifetime";
    } else if (maxDuration === 0) {
      durationText = " for their first purchase";
    } else if (maxDuration && maxDuration > 1) {
      durationText =
        maxDuration % 12 === 0
          ? ` for ${maxDuration / 12} year${maxDuration / 12 > 1 ? "s" : ""}`
          : ` for ${maxDuration} month${maxDuration > 1 ? "s" : ""}`;
    }

    rewards.push({
      icon: Gift, // Using Gift icon for discount
      text: `New users get ${amount} off${durationText}`,
    });
  }

  // Always show rewards - partners will always have rewards through their group
  return (
    <div className="flex flex-col gap-1 p-2.5">
      {rewards.map((reward, index) => {
        const IconComponent = reward.icon;
        return (
          <div key={index} className="flex w-full items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-neutral-100">
              <IconComponent className="size-4" />
            </div>
            <div className="text-xs font-medium leading-4 text-neutral-700">
              {reward.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
