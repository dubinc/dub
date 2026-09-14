"use client";

import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { Button, Gift, Icon, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PropsWithChildren, ReactNode } from "react";
import { formatDiscountDescription } from "./format-discount-description";
import { ProgramRewardDescription } from "./program-reward-description";
import { REWARD_EVENT_ICON } from "./rewards/reward-event-icon";

const EDITABLE_REWARD_EVENTS = new Set(["sale", "lead", "click"]);

type RewardListItem = RewardProps & {
  isOverride?: boolean;
};

type DiscountListItem = DiscountProps & {
  isOverride?: boolean;
};

export function ProgramRewardList({
  rewards,
  discount,
  variant = "default",
  className,
  iconClassName,
  showModifiersTooltip = true,
  onEditReward,
  onEditDiscount,
  editDisabledTooltip,
}: {
  rewards: RewardListItem[];
  discount?: DiscountListItem | null;
  variant?: "default" | "plain";
  className?: string;
  iconClassName?: string;
  showModifiersTooltip?: boolean;
  onEditReward?: (reward: RewardProps) => void;
  onEditDiscount?: (discount: DiscountProps) => void;
  editDisabledTooltip?: ReactNode;
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
            isOverride={reward.isOverride}
            action={
              canEdit ? (
                <EditAction
                  disabledTooltip={editDisabledTooltip}
                  onClick={() => onEditReward(reward)}
                />
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
          isOverride={discount.isOverride}
          action={
            onEditDiscount ? (
              <EditAction
                disabledTooltip={editDisabledTooltip}
                onClick={() => onEditDiscount(discount)}
              />
            ) : undefined
          }
        >
          {formatDiscountDescription(discount)}
        </Item>
      )}
    </ul>
  );
}

function EditAction({
  onClick,
  disabledTooltip,
}: {
  onClick: () => void;
  disabledTooltip?: ReactNode;
}) {
  const button = (
    <button
      type="button"
      className={cn(
        "text-content-subtle shrink-0 text-xs font-medium",
        disabledTooltip
          ? "cursor-not-allowed opacity-50"
          : "hover:text-content-default",
      )}
      disabled={Boolean(disabledTooltip)}
      onClick={disabledTooltip ? undefined : onClick}
    >
      Edit
    </button>
  );

  if (!disabledTooltip) {
    return button;
  }

  return <Tooltip content={disabledTooltip}>{button}</Tooltip>;
}

const Item = ({
  icon: Icon,
  children,
  iconClassName,
  isOverride,
  action,
}: PropsWithChildren<{
  icon: Icon;
  iconClassName?: string;
  isOverride?: boolean;
  action?: ReactNode;
}>) => {
  return (
    <li className="flex items-start gap-2">
      <div className="relative shrink-0 py-px">
        <Icon className={cn("block size-4", iconClassName)} />
        {isOverride && (
          <span aria-hidden className="absolute right-0 top-0 size-1">
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              className="absolute inset-[-50%] overflow-visible"
            >
              <circle
                cx="4"
                cy="4"
                r="3"
                fill="#155DFC"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </li>
  );
};
