import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps, ProgramProps } from "@/lib/types";
import { cn, INFINITY_NUMBER, pluralize } from "@dub/utils";

export function ProgramCommissionDescription({
  program,
  discount,
  amountClassName,
  periodClassName,
}: {
  program: Pick<
    ProgramProps,
    | "commissionAmount"
    | "commissionType"
    | "commissionDuration"
    | "commissionInterval"
  >;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
}) {
  return (
    <>
      Earn{" "}
      <strong className={cn("font-semibold", amountClassName)}>
        {constructRewardAmount({
          amount: program.commissionAmount,
          type: program.commissionType,
        })}{" "}
      </strong>
      for each sale
      {program.commissionDuration === INFINITY_NUMBER ? (
        <strong className={cn("font-semibold", periodClassName)}>
          {" "}
          for the customer's lifetime.
        </strong>
      ) : program.commissionDuration && program.commissionDuration > 1 ? (
        <>
          , and again{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            every {program.commissionInterval || "cycle"} for{" "}
            {program.commissionDuration}{" "}
            {pluralize(
              program.commissionInterval || "cycle",
              program.commissionDuration,
            )}
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
