import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, Reward } from "@/lib/types";
import { cn, pluralize } from "@dub/utils";

export function ProgramRewardDescription({
  reward,
  discount,
  amountClassName,
  periodClassName,
}: {
  reward?: Reward | null;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
}) {
  return (
    <>
      {reward && reward.amount > 0 ? (
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
          off for{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            {discount.duration
              ? `${discount.duration} ${pluralize(discount.interval || "cycle", discount.duration)}.`
              : "their first purchase."}
          </strong>
        </>
      ) : null}
    </>
  );
}
