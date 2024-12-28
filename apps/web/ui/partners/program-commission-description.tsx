import { ProgramProps } from "@/lib/types";
import { cn, currencyFormatter, INFINITY_NUMBER, pluralize } from "@dub/utils";

export function ProgramCommissionDescription({
  program,
  amountClassName,
  periodClassName,
}: {
  program: Pick<
    ProgramProps,
    | "commissionAmount"
    | "commissionType"
    | "commissionDuration"
    | "commissionInterval"
    | "discountAmount"
    | "discountType"
    | "discountDuration"
    | "discountInterval"
  >;
  amountClassName?: string;
  periodClassName?: string;
}) {
  const constructDiscount = ({ amount, type }) => {
    return type === "percentage"
      ? `${amount}%`
      : currencyFormatter(amount / 100, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };
  return (
    <>
      Earn{" "}
      <strong className={cn("font-semibold", amountClassName)}>
        {constructDiscount({
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
            {program.commissionDuration
              ? `${program.commissionDuration} ${pluralize(program.commissionInterval || "cycle", program.commissionDuration)}.`
              : null}
          </strong>
        </>
      ) : (
        "."
      )}
      {program.discountAmount ? (
        <>
          Referred users get{" "}
          <strong className={cn("font-semibold", amountClassName)}>
            {constructDiscount({
              amount: program.discountAmount,
              type: program.discountType,
            })}
          </strong>{" "}
          off for{" "}
          {program.discountDuration
            ? `${program.discountDuration} ${pluralize(program.discountInterval || "cycle", program.discountDuration)}.`
            : "their first purchase."}
        </>
      ) : null}
    </>
  );
}
