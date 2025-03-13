import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { cn, pluralize } from "@dub/utils";

export function ProgramRewardDescription({
  reward,
  discount,
  amountClassName,
  periodClassName,
  hideIfZero = true,
}: {
  reward?: RewardProps | null;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
  hideIfZero?: boolean; // if true, don't display the reward description if the reward amount is 0
}) {
  return (
    <>
      {reward && (reward.amount > 0 || !hideIfZero) ? (
        <>
          Earn{" "}
          <strong className={cn("font-semibold", amountClassName)}>
            {constructRewardAmount({
              amount: reward.amount,
              type: reward.type,
            })}{" "}
          </strong>
          for each {reward.event}
          {reward.maxDuration === null ? (
            <strong className={cn("font-semibold", periodClassName)}>
              {" "}
              for the customer's lifetime.
            </strong>
          ) : reward.maxDuration && reward.maxDuration > 1 ? (
            <>
              , and again{" "}
              <strong className={cn("font-semibold", periodClassName)}>
                every month for {reward.maxDuration} months
              </strong>
              .
            </>
          ) : (
            "."
          )}
        </>
      ) : null}

      {discount ? (
        <>
          {" "}
          Referred users get{" "}
          <strong className={cn("font-semibold", amountClassName)}>
            {constructRewardAmount({
              amount: discount.amount,
              type: discount.type,
            })}
          </strong>{" "}
          off{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            {discount.maxDuration === null ? (
              <strong className={cn("font-semibold", periodClassName)}>
                {" "}
                for their lifetime
              </strong>
            ) : discount.maxDuration && discount.maxDuration > 1 ? (
              <strong className={cn("font-semibold", periodClassName)}>
                for {discount.maxDuration} months
              </strong>
            ) : (
              " for their first purchase"
            )}
            .
          </strong>
        </>
      ) : null}
    </>
  );
}

export function formatRewardDescription({
  reward,
}: {
  reward: RewardProps;
}): string {
  const rewardAmount = constructRewardAmount(reward);
  const parts: string[] = [];

  parts.push(`${rewardAmount} per ${reward.event}`);

  if (reward.event === "sale") {
    if (reward.maxDuration === null) {
      parts.push("for lifetime");
    } else if (reward.maxDuration === 0) {
      parts.push("for the first purchase");
    } else if (reward.maxDuration && reward.maxDuration > 0) {
      parts.push(
        `for ${reward.maxDuration} ${pluralize("month", reward.maxDuration)}`,
      );
    }
  }

  return parts.join(" ");
}
