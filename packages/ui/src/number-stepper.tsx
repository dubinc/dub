import { cn } from "@dub/utils";
import {
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  const [inputValue, setInputValue] = useState<string>(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canDecrement = typeof min === "number" ? value > min : true;
  const canIncrement = typeof max === "number" ? value < max : true;

  // Focus and select input when entering edit mode
  useLayoutEffect(() => {
    if (isEditing && inputRef.current && !disabled) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, disabled]);

  // Update input value when prop value changes (but not while editing)
  useEffect(() => {
    if (!isEditing && inputValue !== String(value)) {
      setInputValue(String(value));
    }
  }, [value, isEditing, inputValue]);

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

    const newValue = constrainToRange(value - step);
    onChange(newValue);
    setInputValue(String(newValue));
  }, [disabled, canDecrement, constrainToRange, onChange, step, value]);

  const handleIncrement = useCallback(() => {
    if (disabled) {
      return;
    }

    if (!canIncrement) {
      return;
    }

    const newValue = constrainToRange(value + step);
    onChange(newValue);
    setInputValue(String(newValue));
  }, [disabled, canIncrement, constrainToRange, onChange, step, value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newInputValue = e.target.value;
      setInputValue(newInputValue);

      // Allow empty input while typing
      if (newInputValue === "" || newInputValue === "-") {
        return;
      }

      const numValue = Number(newInputValue);
      if (!isNaN(numValue)) {
        const constrainedValue = constrainToRange(numValue);
        onChange(constrainedValue);
      }
    },
    [constrainToRange, onChange],
  );

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    const numValue = Number(inputValue);

    // If invalid or empty, reset to current value
    if (isNaN(numValue) || inputValue === "" || inputValue === "-") {
      setInputValue(String(value));
      return;
    }

    // Constrain and update
    const constrainedValue = constrainToRange(numValue);
    onChange(constrainedValue);
    setInputValue(String(constrainedValue));
  }, [inputValue, value, constrainToRange, onChange]);

  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        handleDecrement();
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        handleIncrement();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleInputBlur();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setInputValue(String(value));
        e.currentTarget.blur();
      }
    },
    [disabled, handleDecrement, handleIncrement, handleInputBlur, value],
  );

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

      <div className="relative flex min-w-0 flex-1 items-center justify-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          value={isEditing ? inputValue : String(value)}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          className={cn(
            "w-full border-0 bg-transparent px-3 text-center text-sm text-neutral-900 outline-none transition-colors focus:ring-0",
            disabled && "cursor-not-allowed",
            !disabled && "cursor-text focus:bg-neutral-50",
            !isEditing && formatValue && "pointer-events-none opacity-0",
          )}
        />
        {!isEditing && formatValue && (
          <div
            role="spinbutton"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!disabled) {
                  setIsEditing(true);
                  setInputValue(String(value));
                }
              } else {
                handleInputKeyDown(
                  e as Parameters<typeof handleInputKeyDown>[0],
                );
              }
            }}
            onClick={() => {
              if (!disabled) {
                setIsEditing(true);
                setInputValue(String(value));
              }
            }}
            className={cn(
              "absolute inset-0 flex items-center justify-center px-3 text-sm text-neutral-900 outline-none focus:ring-0",
              !disabled && "cursor-text hover:bg-neutral-50",
            )}
          >
            {formatValue(value)}
          </div>
        )}
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
