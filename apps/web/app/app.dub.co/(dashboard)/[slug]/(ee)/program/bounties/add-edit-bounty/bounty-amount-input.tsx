"use client";

import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { InlineBadgePopoverContext } from "@/ui/shared/inline-badge-popover";
import { cn } from "@dub/utils";
import { useContext } from "react";
import { useBountyFormContext } from "./bounty-form-context";

interface BountyAmountInputProps {
  name: "rewardAmount" | "performanceCondition.value";
  emptyValue?: null | undefined;
}

export function BountyAmountInput({
  name,
  emptyValue = null,
}: BountyAmountInputProps) {
  const { watch, register } = useBountyFormContext();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const attribute =
    name === "performanceCondition.value"
      ? watch("performanceCondition.attribute")
      : null;
  const isCurrency =
    name === "rewardAmount"
      ? true
      : attribute
        ? isCurrencyAttribute(attribute)
        : false;

  return (
    <div className="relative rounded-md shadow-sm">
      {isCurrency && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
          isCurrency ? "pl-4 pr-12" : "pr-7",
        )}
        {...register(name, {
          required: true,
          setValueAs: (value: string) => (value === "" ? emptyValue : +value),
          min: 0,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
            return;
          }

          handleMoneyKeyDown(e);
        }}
      />
      {isCurrency && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
          USD
        </span>
      )}
    </div>
  );
}
