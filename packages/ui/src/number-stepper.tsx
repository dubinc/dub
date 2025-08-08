import { cn } from "@dub/utils";
import { HTMLAttributes, ReactNode, useCallback } from "react";
import { Minus, Plus } from "./icons";

export type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  formatValue?: (value: number) => ReactNode;
  decrementAriaLabel?: string;
  incrementAriaLabel?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  className,
  id,
  formatValue,
  decrementAriaLabel = "Decrease",
  incrementAriaLabel = "Increase",
  ...rest
}: NumberStepperProps) {
  const canDecrement = typeof min === "number" ? value > min : true;
  const canIncrement = typeof max === "number" ? value < max : true;

  const constrainToRange = useCallback(
    (next: number) => {
      let nextValue = next;

      if (typeof min === "number") {
        nextValue = Math.max(min, nextValue);
      }

      if (typeof max === "number") {
        nextValue = Math.min(max, nextValue);
      }

      return nextValue;
    },
    [min, max],
  );

  const handleDecrement = useCallback(() => {
    if (disabled) {
      return;
    }

    if (!canDecrement) {
      return;
    }

    onChange(constrainToRange(value - step));
  }, [disabled, canDecrement, constrainToRange, onChange, step, value]);

  const handleIncrement = useCallback(() => {
    if (disabled) {
      return;
    }

    if (!canIncrement) {
      return;
    }

    onChange(constrainToRange(value + step));
  }, [disabled, canIncrement, constrainToRange, onChange, step, value]);

  return (
    <div
      id={id}
      role="group"
      aria-disabled={disabled}
      className={cn(
        "flex h-10 w-full select-none items-stretch overflow-hidden rounded-lg border border-neutral-200 bg-white",
        disabled && "opacity-60",
        className,
      )}
      {...rest}
    >
      <button
        type="button"
        aria-label={decrementAriaLabel}
        onClick={handleDecrement}
        disabled={disabled || !canDecrement}
        className={cn(
          "flex h-full w-24 items-center justify-center border-r border-neutral-200 text-neutral-700 transition-colors",
          !(disabled || !canDecrement) && "hover:bg-neutral-50",
        )}
      >
        <Minus className="block size-4" />
      </button>

      <div
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onKeyDown={(e) => {
          if (disabled) {
            return;
          }

          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            handleDecrement();
          }
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            handleIncrement();
          }
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center px-3 text-sm text-neutral-900",
        )}
        prefix=""
      >
        {formatValue ? formatValue(value) : value}
      </div>

      <button
        type="button"
        aria-label={incrementAriaLabel}
        onClick={handleIncrement}
        disabled={disabled || !canIncrement}
        className={cn(
          "flex h-full w-24 items-center justify-center border-l border-neutral-200 text-neutral-700 transition-colors",
          !(disabled || !canIncrement) && "hover:bg-neutral-50",
        )}
      >
        <Plus className="block size-4" />
      </button>
    </div>
  );
}

export default NumberStepper;
