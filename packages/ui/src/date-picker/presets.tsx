import { cn } from "@dub/utils";
import { DatePreset, DateRange, DateRangePreset, Preset } from "./types";

type PresetsProps<TPreset extends Preset, TValue> = {
  presets: TPreset[];
  onSelect: (value: TValue) => void;
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
  const isDateRangePresets = (preset: any): preset is DateRangePreset => {
    return "dateRange" in preset;
  };

  const isDatePresets = (preset: any): preset is DatePreset => {
    return "date" in preset;
  };

  const handleClick = (preset: TPreset) => {
    if (isDateRangePresets(preset)) {
      onSelect(preset.dateRange as TValue);
    } else if (isDatePresets(preset)) {
      onSelect(preset.date as TValue);
    }
  };

  const compareDates = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const compareRanges = (range1: DateRange, range2: DateRange) => {
    const from1 = range1.from;
    const from2 = range2.from;

    let equalFrom = false;

    if (from1 && from2) {
      const sameFrom = compareDates(from1, from2);

      if (sameFrom) {
        equalFrom = true;
      }
    }

    const to1 = range1.to;
    const to2 = range2.to;

    let equalTo = false;

    if (to1 && to2) {
      const sameTo = compareDates(to1, to2);

      if (sameTo) {
        equalTo = true;
      }
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
        return (
          <li key={index} className="sm:w-full sm:py-px">
            <button
              title={preset.label}
              className={cn(
                // base
                "relative w-full overflow-hidden text-ellipsis whitespace-nowrap rounded border px-2.5 py-1.5 text-left text-base shadow-sm outline-none transition-all sm:border-none sm:py-2 sm:text-sm sm:shadow-none",
                // text color
                "text-gray-700",
                // border color
                "border-gray-200",
                // focus
                "outline outline-0 outline-offset-2 outline-blue-500 focus-visible:outline-2",
                // background color
                "focus-visible:bg-gray-100",
                "hover:bg-gray-100",
                {
                  "bg-gray-100": matchesCurrent(preset),
                },
              )}
              onClick={() => handleClick(preset)}
              aria-label={`Select ${preset.label}`}
            >
              <span>{preset.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

Presets.displayName = "DatePicker.Presets";

export { Presets };
