import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { Lock } from "lucide-react";
import { useKeyboardShortcut } from "../hooks";
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

  useKeyboardShortcut(
    presets
      .filter((preset) => preset.shortcut)
      .map((preset) => preset.shortcut) as string[],
    (e) => {
      const preset = presets.find((preset) => preset.shortcut === e.key);
      if (preset) onSelect(preset);
    },
  );

  return (
    <Command
      className="w-full rounded ring-gray-200 ring-offset-2 focus:outline-none"
      tabIndex={0}
      autoFocus
      loop
    >
      <Command.List className="[&>*]:flex [&>*]:w-full [&>*]:items-start [&>*]:gap-x-2 [&>*]:gap-y-0.5 [&>*]:sm:flex-col">
        {presets.map((preset, index) => {
          return (
            <Command.Item
              key={index}
              disabled={preset.requiresUpgrade}
              onSelect={() => onSelect(preset)}
              title={preset.label}
              value={preset.id}
              className={cn(
                "group relative flex cursor-pointer items-center justify-between overflow-hidden text-ellipsis whitespace-nowrap rounded border border-gray-200",
                "px-2.5 py-1.5 text-left text-sm text-gray-700 shadow-sm outline-none sm:w-full sm:border-none sm:py-2 sm:shadow-none",
                "disabled:pointer-events-none disabled:opacity-50",
                "sm:data-[selected=true]:bg-gray-100",
                matchesCurrent(preset) && "font-semibold text-gray-800",
              )}
            >
              <span>{preset.label}</span>
              {preset.requiresUpgrade ? (
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              ) : preset.shortcut ? (
                <kbd className="text-gray-4000 rounded bg-gray-100 px-2 py-0.5 text-xs font-light group-data-[selected=true]:bg-gray-200">
                  {preset.shortcut.toUpperCase()}
                </kbd>
              ) : null}
              {preset.requiresUpgrade && preset.tooltipContent && (
                <Tooltip side="bottom" content={preset.tooltipContent}>
                  <div className="absolute inset-0 cursor-not-allowed"></div>
                </Tooltip>
              )}
            </Command.Item>
          );
        })}
      </Command.List>
    </Command>
  );
};

Presets.displayName = "DatePicker.Presets";

export { Presets };
