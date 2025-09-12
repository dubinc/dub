import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { Gift, Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { REWARD_EVENTS } from "./constants";
import { ProgramRewardModifiersTooltip } from "./program-reward-modifiers-tooltip";

export function ProgramRewardList({
  rewards,
  discount,
  variant,
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
  const sortedFilteredRewards = rewards.filter((r) => r.amount >= 0);

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
              {showModifiersTooltip && !!reward.modifiers?.length && (
                <>
                  {" "}
                  <ProgramRewardModifiersTooltip reward={reward} />
                </>
              )}
            </>
          )}
        </Item>
      ))}
      {discount && (
        <Item icon={Gift} iconClassName={iconClassName}>
          {discount.description || (
            <>
              {" "}
              New users get {constructRewardAmount(discount)} off{" "}
              {discount.maxDuration === null
                ? "for their lifetime"
                : discount.maxDuration === 0
                  ? "for their first purchase"
                  : discount.maxDuration === 1
                    ? "for their first month"
                    : discount.maxDuration && discount.maxDuration > 1
                      ? `for ${discount.maxDuration} months`
                      : null}
            </>
          )}
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
