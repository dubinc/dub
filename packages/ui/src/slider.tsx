"use client";

import { cn } from "@dub/utils";
import * as RadixSlider from "@radix-ui/react-slider";
import { ReactNode } from "react";

export type SliderProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  marks?: number[];
  formatValue?: (value: number) => ReactNode;
  className?: string;
  hint?: ReactNode;
  disabled?: boolean;
};

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  marks,
  formatValue,
  className,
  hint,
  disabled,
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  const sliderMarks = marks || [
    min,
    min + (max - min) / 3,
    min + (2 * (max - min)) / 3,
    max,
  ];

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 text-3xl font-semibold text-neutral-900">
        {formatValue ? formatValue(value) : value}
      </div>

      <RadixSlider.Root
        className="relative flex h-6 w-full items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]: number[]) => onChange(v)}
        disabled={disabled}
        aria-label="Slider"
      >
        <RadixSlider.Track className="relative h-3 w-full rounded-full bg-neutral-200">
          <RadixSlider.Range className="absolute h-3 rounded-full bg-neutral-900" />

          {sliderMarks.map((mark, i) => {
            const left = ((mark - min) / (max - min)) * 100;
            return (
              <span
                key={mark}
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border",
                  left === percent
                    ? "border-neutral-900 bg-white shadow"
                    : "border-none bg-neutral-200",
                  "transition-all duration-200",
                )}
                style={{ left: `calc(${left}% - 0.75rem)` }}
              >
                {left === percent && (
                  <span className="block h-4 w-4 rounded-full bg-neutral-900" />
                )}
              </span>
            );
          })}
        </RadixSlider.Track>

        <RadixSlider.Thumb
          className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-neutral-900 bg-white shadow focus:outline-none focus:ring-2 focus:ring-neutral-400"
          style={{ left: `calc(${percent}% - 0.75rem)` }}
        />
      </RadixSlider.Root>

      {hint && <div className="mt-2 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
} 