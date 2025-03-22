import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { Gift, Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { REWARD_EVENTS } from "./constants";

export function ProgramRewardList({
  rewards,
  discount,
  className,
}: {
  rewards: RewardProps[];
  discount?: DiscountProps | null;
  className?: string;
}) {
  const sortedFilteredRewards = rewards.filter((r) => r.amount >= 0);

  return (
    <ul
      className={cn(
        "text-content-default border-border-subtle bg-bg-default flex flex-col gap-4 rounded-md border p-4",
        className,
      )}
    >
      {sortedFilteredRewards.map((reward) => (
        <Item key={reward.id} icon={REWARD_EVENTS[reward.event].icon}>
          {constructRewardAmount({
            amount: reward.amount,
            type: reward.type,
          })}{" "}
          per {reward.event}
          {reward.maxDuration === null ? (
            <> for the customer's lifetime</>
          ) : reward.maxDuration && reward.maxDuration > 1 ? (
            <>, and again every month for {reward.maxDuration} months</>
          ) : null}
        </Item>
      ))}
      {discount && (
        <Item icon={Gift}>
          {" "}
          Users get{" "}
          {constructRewardAmount({
            amount: discount.amount,
            type: discount.type,
          })}{" "}
          off{" "}
          {discount.maxDuration === null ? (
            <> for their lifetime</>
          ) : discount.maxDuration && discount.maxDuration > 1 ? (
            <>for {discount.maxDuration} months</>
          ) : (
            <>for their first purchase</>
          )}
        </Item>
      )}
    </ul>
  );
}

const Item = ({ icon: Icon, children }: PropsWithChildren<{ icon: Icon }>) => {
  return (
    <li className="flex items-start gap-2 text-sm leading-tight">
      <Icon className="size-4 shrink-0 translate-y-px" />
      <div>{children}</div>
    </li>
  );
};
