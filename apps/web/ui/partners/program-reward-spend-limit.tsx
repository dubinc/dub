import { RewardProps } from "@/lib/types";
import { SpendLimitInterval } from "@dub/prisma/client";
import { cn, currencyFormatter } from "@dub/utils";

function getSpendLimitDescriptionParts({
  spendLimitAmount,
  spendLimitInterval,
}: Pick<RewardProps, "spendLimitAmount" | "spendLimitInterval">) {
  if (spendLimitAmount == null || spendLimitInterval == null) {
    return null;
  }

  return {
    amount: currencyFormatter(spendLimitAmount, {
      trailingZeroDisplay: "stripIfInteger",
    }),
    interval:
      spendLimitInterval === "allTime"
        ? "in total"
        : `per ${spendLimitInterval}`,
  };
}

export function ProgramRewardSpendLimit({
  spendLimitAmount,
  spendLimitInterval,
  className,
}: {
  spendLimitAmount?: number | null;
  spendLimitInterval?: SpendLimitInterval | null;
  className?: string;
}) {
  const parts = getSpendLimitDescriptionParts({
    spendLimitAmount,
    spendLimitInterval,
  });

  if (!parts) {
    return null;
  }

  return (
    <>
      {" "}
      up to{" "}
      <strong className={cn("font-semibold", className)}>
        {parts.amount}
      </strong>{" "}
      {parts.interval}
    </>
  );
}
