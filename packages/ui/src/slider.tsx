"use client";

import { cn } from "@dub/utils";
import * as RadixSlider from "@radix-ui/react-slider";
import { ReactNode } from "react";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  marks?: number[];
  className?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  marks,
  className,
  hint,
  disabled,
}: SliderProps) {
  const sliderMarks = marks || [
    min,
    min + (max - min) / 3,
    min + (2 * (max - min)) / 3,
    max,
  ];

  return (
    <div
      className={cn(
        "relative z-0 [--thumb-radius:13px] [--track-height:16px]",
        className,
      )}
    >
      <div className="w-full">
        <RadixSlider.Root
          className="relative flex h-8 w-full items-center"
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]: number[]) => onChange(v)}
          disabled={disabled}
          aria-label="Slider"
        >
          <RadixSlider.Track className="relative h-[var(--track-height)] w-full overflow-visible rounded-full bg-neutral-200">
            {/* Start of filled track (since actual filled track is inset by the thumb radius) */}
            <div className="absolute left-0 top-0 h-full w-[var(--thumb-radius)] rounded-l-full bg-black" />

            <div className="pointer-events-none absolute inset-x-[var(--thumb-radius)] inset-y-0">
              <RadixSlider.Range className="absolute h-[var(--track-height)] bg-black" />

              {sliderMarks.map((mark) => {
                const left = ((mark - min) / (max - min)) * 100;

                return (
                  <span
                    key={mark}
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                    style={{ left: `${left}%` }}
                  />
                );
              })}
            </div>
          </RadixSlider.Track>

          <RadixSlider.Thumb className="z-20 flex size-[calc(var(--thumb-radius)*2)] items-center justify-center rounded-full border-0 bg-white shadow-[0_2px_2px_rgba(0,0,0,0.10),0_3px_3px_rgba(0,0,0,0.09)]">
            <span className="block size-[calc(var(--thumb-radius)*1.23)] rounded-full bg-[#171717]" />
          </RadixSlider.Thumb>
        </RadixSlider.Root>

        {hint && (
          <div className="mt-2 min-h-[1rem] text-xs text-neutral-500">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
