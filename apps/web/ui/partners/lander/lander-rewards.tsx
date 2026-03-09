"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import {
  DiscountProps,
  GroupBountySummaryProps,
  RewardProps,
} from "@/lib/types";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { Gift, Heart, Icon, Trophy } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren, useState } from "react";
import { REWARD_EVENTS } from "../constants";
import { formatDiscountDescription } from "../format-discount-description";
import { ProgramRewardModifiersTooltip } from "../program-reward-modifiers-tooltip";

const MAX_VISIBLE_BOUNTIES = 3;

export function LanderRewards({
  rewards,
  discount,
  bounties = [],
  className,
}: {
  rewards: RewardProps[];
  discount: DiscountProps | null;
  bounties?: GroupBountySummaryProps[];
  className?: string;
}) {
  const sortedFilteredRewards = rewards.filter((reward) => {
    const rawAmount =
      reward.type === "flat" ? reward.amountInCents : reward.amountInPercentage;

    return rawAmount != null && getRewardAmount(reward) > 0;
  });
  const [showAllBounties, setShowAllBounties] = useState(false);
  const shouldCollapseBounties = bounties.length > MAX_VISIBLE_BOUNTIES;
  const visibleBounties =
    shouldCollapseBounties && !showAllBounties
      ? bounties.slice(0, MAX_VISIBLE_BOUNTIES)
      : bounties;

  if (sortedFilteredRewards.length === 0 && !discount && bounties.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[10px] border border-neutral-200 bg-neutral-50 px-5 py-4",
        className,
      )}
    >
      {Boolean(sortedFilteredRewards.length || discount) && (
        <div className={cn(bounties.length > 0 && "mb-5")}>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-neutral-800">
            Rewards
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm font-medium tracking-[-0.02em] text-neutral-600">
            {sortedFilteredRewards.map((reward) => (
              <Item key={reward.id} icon={REWARD_EVENTS[reward.event].icon}>
                {reward.description || (
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
                        for the customer's lifetime
                      </>
                    ) : reward.maxDuration && reward.maxDuration > 1 ? (
                      <>
                        {" "}
                        for{" "}
                        {reward.maxDuration % 12 === 0
                          ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
                          : `${reward.maxDuration} months`}
                      </>
                    ) : null}
                  </>
                )}
                {(!!reward.modifiers?.length ||
                  Boolean(reward.tooltipDescription)) && (
                  <>
                    {" "}
                    <ProgramRewardModifiersTooltip reward={reward} />
                  </>
                )}
              </Item>
            ))}

            {discount && (
              <Item icon={Gift}>{formatDiscountDescription(discount)}</Item>
            )}
          </ul>
        </div>
      )}

      {bounties.length > 0 && (
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-neutral-800">
            Bounties
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm font-medium tracking-[-0.02em] text-neutral-600">
            {visibleBounties.map((bounty) => (
              <Item
                key={bounty.id}
                icon={bounty.type === "performance" ? Trophy : Heart}
              >
                {bounty.name}
              </Item>
            ))}
          </ul>
          {shouldCollapseBounties && (
            <button
              type="button"
              className={cn(
                "mt-3 flex h-6 w-fit items-center justify-center rounded-md px-1.5 text-xs font-medium tracking-[-0.02em] text-neutral-900 transition-colors",
                "bg-neutral-200/50 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
              )}
              onClick={() => setShowAllBounties((current) => !current)}
            >
              {showAllBounties ? "View less bounties" : "View all bounties"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const Item = ({
  icon: IconComponent,
  children,
}: PropsWithChildren<{ icon: Icon }>) => {
  return (
    <li className="flex items-center gap-2 leading-5">
      <IconComponent className="size-4 shrink-0 text-neutral-600" />
      <div>{children}</div>
    </li>
  );
};
