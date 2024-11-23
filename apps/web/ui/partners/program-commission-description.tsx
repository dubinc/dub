import { ProgramProps } from "@/lib/types";
import { cn, currencyFormatter, pluralize } from "@dub/utils";

export function ProgramCommissionDescription({
  program,
  amountClassName,
  periodClassName,
}: {
  program: Pick<
    ProgramProps,
    | "commissionType"
    | "commissionAmount"
    | "recurringCommission"
    | "recurringDuration"
    | "recurringInterval"
    | "isLifetimeRecurring"
  >;
  amountClassName?: string;
  periodClassName?: string;
}) {
  return (
    <>
      Earn{" "}
      <strong className={cn("font-semibold", amountClassName)}>
        {program.commissionType === "percentage"
          ? program.commissionAmount + "%"
          : currencyFormatter(program.commissionAmount / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
      </strong>
      for each sale
      {program.isLifetimeRecurring ? (
        <strong className={cn("font-semibold", periodClassName)}>
          {" "}
          for the customer's lifetime.
        </strong>
      ) : program.recurringCommission &&
        program.recurringDuration &&
        program.recurringDuration > 0 ? (
        <>
          , and again{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            every {program.recurringInterval || "cycle"} for{" "}
            {program.recurringDuration
              ? `${program.recurringDuration} ${pluralize(program.recurringInterval || "cycle", program.recurringDuration)}.`
              : null}
          </strong>
        </>
      ) : (
        "."
      )}
    </>
  );
}
