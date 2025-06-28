import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { cn } from "@dub/utils";

export function ProgramRewardDescription({
  reward,
  discount,
  amountClassName,
  periodClassName,
}: {
  reward?: Pick<
    RewardProps,
    "amount" | "type" | "event" | "maxDuration" | "description"
  > | null;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
}) {
  return (
    <>
      {reward
        ? reward.description || (
            <>
              Earn{" "}
              <strong className={cn("font-semibold", amountClassName)}>
                {constructRewardAmount({
                  amount: reward.amount,
                  type: reward.type,
                })}{" "}
              </strong>
              {reward.event === "sale" && reward.maxDuration === 0 ? (
                <>for the first sale</>
              ) : (
                <>per {reward.event}</>
              )}
              {reward.maxDuration === null ? (
                <>
                  {" "}
                  for the{" "}
                  <strong className={cn("font-semibold", periodClassName)}>
                    customer's lifetime
                  </strong>
                </>
              ) : reward.maxDuration && reward.maxDuration > 1 ? (
                <>
                  {" "}
                  for{" "}
                  <strong className={cn("font-semibold", periodClassName)}>
                    {reward.maxDuration % 12 === 0
                      ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
                      : `${reward.maxDuration} months`}
                  </strong>
                </>
              ) : null}
            </>
          )
        : null}

      {discount ? (
        <>
          {" "}
          New users get{" "}
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
          </strong>
        </>
      ) : null}
    </>
  );
}
