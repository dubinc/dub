import { constructDiscountAmount } from "@/lib/api/sales/construct-discount-amount";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, RewardProps } from "@/lib/types";
import { cn } from "@dub/utils";
import { ProgramRewardModifiersTooltip } from "./program-reward-modifiers-tooltip";

export function ProgramRewardDescription({
  reward,
  discount,
  amountClassName,
  periodClassName,
  showModifiersTooltip = true,
}: {
  reward?: Omit<RewardProps, "id"> | null;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
  showModifiersTooltip?: boolean; // used in server-side reward description construction
}) {
  return (
    <>
      {reward
        ? reward.description || (
            <>
              Earn{" "}
              <strong
                className={cn("font-semibold lowercase", amountClassName)}
              >
                {constructRewardAmount(reward)}{" "}
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
              {/* Modifiers */}
              {showModifiersTooltip && !!reward.modifiers?.length && (
                <>
                  {" "}
                  <ProgramRewardModifiersTooltip reward={reward} />
                </>
              )}
            </>
          )
        : null}

      {discount ? (
        <>
          {" "}
          New users get{" "}
          <strong className={cn("font-semibold", amountClassName)}>
            {constructDiscountAmount(discount)}
          </strong>{" "}
          off{" "}
          {discount.maxDuration === null ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for their lifetime
            </strong>
          ) : discount.maxDuration === 0 ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for their first purchase
            </strong>
          ) : discount.maxDuration === 1 ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for their first month
            </strong>
          ) : discount.maxDuration && discount.maxDuration > 1 ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for {discount.maxDuration} months
            </strong>
          ) : null}
        </>
      ) : null}
    </>
  );
}
