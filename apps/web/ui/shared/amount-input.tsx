import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { cn } from "@dub/utils";
import { forwardRef, InputHTMLAttributes } from "react";

export type AmountType = "flat" | "percentage";

interface AmountInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  amountType?: AmountType;
  error?: string;
  currency?: string;
  prefix?: string;
  suffix?: string;
  containerClassName?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      error,
      currency = "USD",
      amountType = "flat",
      prefix,
      suffix,
      containerClassName,
      className,
      id,
      onKeyDown,
      onChange,
      ...props
    },
    ref,
  ) => {
    const inputId = id || "amount";
    const isFlat = amountType === "flat";
    const displayPrefix = prefix ?? (isFlat ? "$" : "");
    const displaySuffix = suffix ?? (isFlat ? currency : "%");

    return (
      <div className={containerClassName}>
        <div className="relative rounded-md shadow-sm">
          {displayPrefix && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
              {displayPrefix}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            className={cn(
              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
              displayPrefix && "pl-6",
              displaySuffix && "pr-12",
              error && "border-red-600 focus:border-red-500 focus:ring-red-600",
              className,
            )}
            min="0"
            step={isFlat ? "0.01" : "1"}
            max={!isFlat ? 100 : undefined}
            onKeyDown={(e) => {
              handleMoneyKeyDown(e);
              onKeyDown?.(e);
            }}
            onChange={(e) => {
              handleMoneyInputChange(e);
              onChange?.(e);
            }}
            {...props}
          />

          {displaySuffix && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
              {displaySuffix}
            </span>
          )}
        </div>

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

AmountInput.displayName = "AmountInput";
