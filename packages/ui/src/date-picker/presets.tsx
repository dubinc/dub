import { cn } from "@dub/utils";
import { Lock } from "lucide-react";
import { PropsWithChildren } from "react";
import { Tooltip } from "../tooltip";
import { DatePreset, DateRange, DateRangePreset, Preset } from "./types";

type PresetsProps<TPreset extends Preset, TValue> = {
  presets: TPreset[];
  onSelect: (preset: TPreset) => void;
  currentValue?: TValue;
};

const Presets = <TPreset extends Preset, TValue>({
  // Available preset configurations
  presets,
  // Event handler when a preset is selected
  onSelect,
  // Currently selected preset
  currentValue,
}: PresetsProps<TPreset, TValue>) => {
  const isDateRangePresets = (preset: any): preset is DateRangePreset =>
    "dateRange" in preset;

  const isDatePresets = (preset: any): preset is DatePreset => "date" in preset;

  const compareDates = (date1: Date, date2: Date) =>
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();

  const compareRanges = (range1: DateRange, range2: DateRange) => {
    const from1 = range1.from;
    const from2 = range2.from;

    let equalFrom = false;

    if (from1 && from2) {
      const sameFrom = compareDates(from1, from2);

      if (sameFrom) equalFrom = true;
    }

    const to1 = range1.to;
    const to2 = range2.to;

    let equalTo = false;

    if (to1 && to2) {
      const sameTo = compareDates(to1, to2);

      if (sameTo) equalTo = true;
    }

    return equalFrom && equalTo;
  };

  const matchesCurrent = (preset: TPreset) => {
    if (isDateRangePresets(preset)) {
      const value = currentValue as DateRange | undefined;

      return value && compareRanges(value, preset.dateRange);
    } else if (isDatePresets(preset)) {
      const value = currentValue as Date | undefined;

      return value && compareDates(value, preset.date);
    }

    return false;
  };

  return (
    <ul role="list" className="flex items-start gap-x-2 sm:flex-col">
      {presets.map((preset, index) => {
        const Wrapper = ({ children }: PropsWithChildren) =>
          preset.tooltipContent ? (
            <Tooltip side="bottom" content={preset.tooltipContent}>
              <div className="cursor-not-allowed">{children}</div>
            </Tooltip>
          ) : (
            children
          );
        return (
          <li key={index} className="sm:w-full sm:py-px">
            <Wrapper>
              <button
                title={preset.label}
                className={cn(
                  "relative flex w-full items-center justify-between overflow-hidden text-ellipsis whitespace-nowrap rounded border px-2.5 py-1.5 text-left text-base shadow-sm outline-none transition-all sm:border-none sm:py-2 sm:text-sm sm:shadow-none",
                  "border-gray-200 text-gray-700",
                  "outline outline-0 outline-offset-2 outline-blue-500 focus-visible:bg-gray-100 focus-visible:outline-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                  matchesCurrent(preset)
                    ? "bg-blue-100 hover:bg-blue-200"
                    : "hover:bg-gray-100 active:bg-gray-200",
                )}
                onClick={() => onSelect(preset)}
                aria-label={`Select ${preset.label}`}
                disabled={preset.requiresUpgrade}
              >
                <span>{preset.label}</span>
                {preset.requiresUpgrade && (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </Wrapper>
          </li>
        );
      })}
    </ul>
  );
};

Presets.displayName = "DatePicker.Presets";

export { Presets };
