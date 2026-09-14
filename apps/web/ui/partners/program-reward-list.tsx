"use client";

import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { Button, Gift, Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PropsWithChildren, ReactNode } from "react";
import { formatDiscountDescription } from "./format-discount-description";
import { ProgramRewardDescription } from "./program-reward-description";
import { REWARD_EVENT_ICON } from "./rewards/reward-event-icon";

const EDITABLE_REWARD_EVENTS = new Set(["sale", "lead", "click"]);

export function ProgramRewardList({
  rewards,
  discount,
  variant = "default",
  className,
  iconClassName,
  showModifiersTooltip = true,
  onEditReward,
  onEditDiscount,
}: {
  rewards: RewardProps[];
  discount?: DiscountProps | null;
  variant?: "default" | "plain";
  className?: string;
  iconClassName?: string;
  showModifiersTooltip?: boolean;
  onEditReward?: (reward: RewardProps) => void;
  onEditDiscount?: (discount: DiscountProps) => void;
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
      {sortedFilteredRewards.map((reward) => {
        const canEdit =
          onEditReward && EDITABLE_REWARD_EVENTS.has(reward.event);

        return (
          <Item
            key={reward.id}
            icon={REWARD_EVENT_ICON[reward.event]}
            iconClassName={iconClassName}
            action={
              canEdit ? (
                <button
                  type="button"
                  className="text-content-subtle hover:text-content-default shrink-0 text-xs font-medium"
                  onClick={() => onEditReward(reward)}
                >
                  Edit
                </button>
              ) : undefined
            }
          >
            <ProgramRewardDescription
              reward={reward}
              showModifiersTooltip={showModifiersTooltip}
            />
          </Item>
        );
      })}

      {discount && (
        <Item
          icon={Gift}
          iconClassName={iconClassName}
          action={
            onEditDiscount ? (
              <button
                type="button"
                className="text-content-subtle hover:text-content-default shrink-0 text-xs font-medium"
                onClick={() => onEditDiscount(discount)}
              >
                Edit
              </button>
            ) : undefined
          }
        >
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
  action,
}: PropsWithChildren<{
  icon: Icon;
  iconClassName?: string;
  action?: ReactNode;
}>) => {
  return (
    <li className="flex items-start gap-2">
      <Icon className={cn("size-4 shrink-0 translate-y-px", iconClassName)} />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </li>
  );
};
