import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, Reward } from "@/lib/types";
import { capitalize, cn, pluralize } from "@dub/utils";

export function ProgramRewardDescription({
  reward,
  discount,
  amountClassName,
  periodClassName,
}: {
  reward: Reward;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
}) {
  return (
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
