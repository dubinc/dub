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
          ? Math.min(Math.max(program.commissionAmount, 0), 100) + "%"
          : currencyFormatter(program.commissionAmount / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
      </strong>
      for each conversion
      {program.recurringCommission &&
      ((program.recurringDuration && program.recurringDuration > 0) ||
        program.isLifetimeRecurring) ? (
        <>
          , and again{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            every {program.recurringInterval || "cycle"} for{" "}
            {program.isLifetimeRecurring
              ? "the customer's lifetime."
              : program.recurringDuration
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
