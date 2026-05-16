"use client";

import { MAX_DURATION_LIMIT } from "@/lib/zod/schemas/misc";
import { pluralize } from "@dub/utils";
import { ChangeEvent, useContext, useEffect, useState } from "react";
import {
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "./inline-badge-popover";

export function DurationPopoverContent({
  value,
  onChange,
  presetDurations,
}: DurationPopoverContentProps) {
  const { isOpen, setIsOpen } = useContext(InlineBadgePopoverContext);
  const [customDurationInput, setCustomDurationInput] = useState<string>(() => {
    if (
      value !== null &&
      value !== undefined &&
      value !== Infinity &&
      value !== 0 &&
      !presetDurations.includes(Number(value))
    ) {
      return value.toString();
    }
    return "";
  });
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (showCustomInput) return;

    if (
      value === null ||
      value === undefined ||
      value === Infinity ||
      value === 0 ||
      presetDurations.includes(Number(value))
    ) {
      setCustomDurationInput("");
      return;
    }

    setCustomDurationInput(value.toString());
  }, [value, presetDurations, showCustomInput]);

  useEffect(() => {
    if (!isOpen) return;
    if (customDurationInput === "") return;
    setShowCustomInput(true);
  }, [isOpen, customDurationInput]);

  const isPresetValue =
    value === Infinity ||
    value === 0 ||
    presetDurations.includes(Number(value));

  if (showCustomInput) {
    return (
      <div className="flex flex-col gap-1.5 p-1">
        <button
          type="button"
          onClick={() => setShowCustomInput(false)}
          className="flex items-center gap-1 rounded px-0.5 text-xs text-neutral-500 transition-colors hover:text-neutral-700"
        >
          ← Presets
        </button>
        <label className="flex w-full rounded-md border border-neutral-300 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500 sm:w-32">
          <input
            type="number"
            min="0"
            max={MAX_DURATION_LIMIT.toString()}
            step="1"
            autoFocus
            placeholder="e.g. 24"
            value={customDurationInput}
            className="block min-w-0 grow rounded-md border-none py-1 pl-1.5 pr-0 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value;
              const parsed = parseInt(raw, 10);
              const clamped = Math.max(0, Math.min(parsed, MAX_DURATION_LIMIT));
              const display = isNaN(parsed) ? raw : clamped.toString();
              setCustomDurationInput(display);
              if (!isNaN(parsed) && parsed >= 0) {
                onChange(clamped);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.nativeEvent.stopImmediatePropagation();
                e.preventDefault();
                setShowCustomInput(false);
                return;
              }
              if (e.key === "Backspace" && customDurationInput === "") {
                setShowCustomInput(false);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (customDurationInput === "0") {
                  onChange(0);
                  setCustomDurationInput("");
                  setShowCustomInput(false);
                  return;
                }
                setIsOpen(false);
              }
            }}
          />
          <span className="flex shrink-0 items-center pr-1.5 text-sm text-neutral-400">
            months
          </span>
        </label>
      </div>
    );
  }

  return (
    <InlineBadgePopoverMenu
      selectedValue={isPresetValue ? value?.toString() : undefined}
      onSelect={(selectedValue) => {
        if (selectedValue === "custom") {
          setShowCustomInput(true);
          return;
        }

        onChange(
          selectedValue === "Infinity" ? Infinity : Number(selectedValue),
        );
        setCustomDurationInput("");
      }}
      items={[
        { text: "one time", value: "0" },
        ...presetDurations
          .filter((duration) => duration !== 0)
          .map((duration) => ({
            text: `for ${duration} ${pluralize("month", Number(duration))}`,
            value: duration.toString(),
          })),
        { text: "for the customer's lifetime", value: "Infinity" },
        { text: "custom", value: "custom", preventClose: true },
      ]}
    />
  );
}

type DurationPopoverContentProps = {
  value: number | undefined;
  onChange: (value: number) => void;
  presetDurations: number[];
};
