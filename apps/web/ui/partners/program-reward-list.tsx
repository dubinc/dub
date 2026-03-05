"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { Button, Gift, Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PropsWithChildren } from "react";
import { REWARD_EVENTS } from "./constants";
import { formatDiscountDescription } from "./format-discount-description";
import { ProgramRewardModifiersTooltip } from "./program-reward-modifiers-tooltip";

export function ProgramRewardList({
  rewards,
  discount,
  variant = "default",
  className,
  iconClassName,
  showModifiersTooltip = true,
}: {
  rewards: RewardProps[];
  discount?: DiscountProps | null;
  variant?: "default" | "plain";
  className?: string;
  iconClassName?: string;
  showModifiersTooltip?: boolean;
}) {
  const { programSlug } = useParams();
  const sortedFilteredRewards = rewards.filter((r) => getRewardAmount(r) >= 0);

  if (sortedFilteredRewards.length === 0 && !discount) {
    return (
      <div className="border-border-subtle bg-bg-default flex items-center justify-between rounded-md border px-4 py-3">
        <p className="text-content-subtle text-sm">
          You are not eligible for any rewards at this time.
        </p>

        {programSlug && (
          <Link href={`/messages/${programSlug}`}>
            <Button
              variant="secondary"
              text="Contact program"
              className="h-8 rounded-lg px-3"
            />
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "text-content-default flex flex-col gap-4 text-sm leading-tight",
        variant === "default" &&
          "border-border-subtle bg-bg-default rounded-md border p-4",
        className,
      )}
    >
      {sortedFilteredRewards.map((reward) => (
        <Item
          key={reward.id}
          icon={REWARD_EVENTS[reward.event].icon}
          iconClassName={iconClassName}
        >
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
                  for the{" "}
                  <strong className={cn("font-semibold")}>
                    customer's lifetime
                  </strong>
                </>
              ) : reward.maxDuration && reward.maxDuration > 1 ? (
                <>
                  {" "}
                  for{" "}
                  <strong className={cn("font-semibold")}>
                    {reward.maxDuration % 12 === 0
                      ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
                      : `${reward.maxDuration} months`}
                  </strong>
                </>
              ) : null}
            </>
          )}

          {/* Modifiers */}
          {showModifiersTooltip &&
            (!!reward.modifiers?.length ||
              Boolean(reward.tooltipDescription)) && (
              <>
                {" "}
                <ProgramRewardModifiersTooltip reward={reward} />
              </>
            )}
        </Item>
      ))}

      {discount && (
        <Item icon={Gift} iconClassName={iconClassName}>
          {formatDiscountDescription(discount)}
        </Item>
      )}
    </ul>
  );
}

const Item = ({
  icon: Icon,
  children,
  iconClassName,
}: PropsWithChildren<{ icon: Icon; iconClassName?: string }>) => {
  return (
    <li className="flex items-start gap-2">
      <Icon className={cn("size-4 shrink-0 translate-y-px", iconClassName)} />
      <div>{children}</div>
    </li>
  );
};
