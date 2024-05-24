import { cn } from "@dub/utils";
import { Time } from "@internationalized/date";
import { TimeValue } from "@react-aria/datepicker";
import { enUS } from "date-fns/locale";
import { Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../button";
import { useMediaQuery } from "../hooks";
import { Popover } from "../popover";
import { Calendar as CalendarPrimitive } from "./calendar";
import { Presets } from "./presets";
import { DatePickerContext, formatDate, validatePresets } from "./shared";
import { TimeInput } from "./time-input";
import { Trigger } from "./trigger";
import { DateRange, DateRangePreset, PickerProps } from "./types";

type RangeDatePickerProps = {
  presets?: DateRangePreset[];
  defaultValue?: DateRange;
  value?: DateRange;
  onChange?: (dateRange: DateRange | undefined) => void;
} & PickerProps;

const DateRangePickerInner = ({
  defaultValue,
  value,
  onChange,
  presets,
  disabled,
  disableNavigation,
  disabledDays,
  showYearNavigation = false,
  locale = enUS,
  showTimePicker,
  placeholder = "Select date range",
  hasError,
  align = "center",
  className,
  ...props
}: RangeDatePickerProps) => {
  const { isDesktop } = useMediaQuery();

  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    value ?? defaultValue ?? undefined,
  );
  const [month, setMonth] = useState<Date | undefined>(range?.from);

  const [startTime, setStartTime] = useState<TimeValue>(
    value?.from
      ? new Time(value.from.getHours(), value.from.getMinutes())
      : defaultValue?.from
        ? new Time(defaultValue.from.getHours(), defaultValue.from.getMinutes())
        : new Time(0, 0),
  );
  const [endTime, setEndTime] = useState<TimeValue>(
    value?.to
      ? new Time(value.to.getHours(), value.to.getMinutes())
      : defaultValue?.to
        ? new Time(defaultValue.to.getHours(), defaultValue.to.getMinutes())
        : new Time(0, 0),
  );

  const initialRange = useMemo(() => {
    return range;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setRange(value ?? defaultValue ?? undefined);
  }, [value, defaultValue]);

  useEffect(() => {
    if (range) {
      setMonth(range.from);
    }
  }, [range]);

  useEffect(() => {
    if (!open) {
      setMonth(range?.from);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onRangeChange = (range: DateRange | undefined) => {
    const newRange = range;
    if (showTimePicker) {
      if (newRange?.from) {
        if (startTime) {
          newRange.from.setHours(startTime.hour);
          newRange.from.setMinutes(startTime.minute);
        } else setStartTime(new Time(0, 0));
      }

      if (newRange?.to) {
        if (endTime) {
          newRange.to.setHours(endTime?.hour);
          newRange.to.setMinutes(endTime?.minute);
        } else setEndTime(new Time(0, 0));
      }
    }

    setRange(newRange);
  };

  const onCancel = () => {
    setRange(initialRange);
    setStartTime(
      initialRange?.from
        ? new Time(initialRange.from.getHours(), initialRange.from.getMinutes())
        : new Time(0, 0),
    );
    setEndTime(
      initialRange?.to
        ? new Time(initialRange.to.getHours(), initialRange.to.getMinutes())
        : new Time(0, 0),
    );
    setOpen(false);
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }

    setOpen(open);
  };

  const onTimeChange = (time: TimeValue, pos: "start" | "end") => {
    switch (pos) {
      case "start":
        setStartTime(time);
        break;
      case "end":
        setEndTime(time);
        break;
    }

    if (!range) return;

    if (pos === "start") {
      if (!range.from) {
        return;
      }

      const newDate = new Date(range.from.getTime());

      if (!time) {
        newDate.setHours(0);
        newDate.setMinutes(0);
      } else {
        newDate.setHours(time.hour);
        newDate.setMinutes(time.minute);
      }

      setRange({
        ...range,
        from: newDate,
      });
    }

    if (pos === "end") {
      if (!range.to) {
        return;
      }

      const newDate = new Date(range.to.getTime());

      if (!time) {
        newDate.setHours(23);
        newDate.setMinutes(59);
      } else {
        newDate.setHours(time.hour);
        newDate.setMinutes(time.minute);
      }

      setRange({
        ...range,
        to: newDate,
      });
    }
  };

  useEffect(() => {
    setRange(value ?? defaultValue ?? undefined);

    setStartTime(
      value?.from
        ? new Time(value.from.getHours(), value.from.getMinutes())
        : defaultValue?.from
          ? new Time(
              defaultValue.from.getHours(),
              defaultValue.from.getMinutes(),
            )
          : new Time(0, 0),
    );
    setEndTime(
      value?.to
        ? new Time(value.to.getHours(), value.to.getMinutes())
        : defaultValue?.to
          ? new Time(defaultValue.to.getHours(), defaultValue.to.getMinutes())
          : new Time(0, 0),
    );
  }, [value, defaultValue]);

  const displayRange = useMemo(() => {
    if (!range) return null;

    return `${range.from ? formatDate(range.from, locale, showTimePicker) : ""} - ${
      range.to ? formatDate(range.to, locale, showTimePicker) : ""
    }`;
  }, [range, locale, showTimePicker]);

  const onApply = () => {
    setOpen(false);
    onChange?.(range);
  };

  return (
    <DatePickerContext.Provider value={{ isOpen: open, setIsOpen: setOpen }}>
      <Popover
        align={align}
        openPopover={open}
        setOpenPopover={onOpenChange}
        popoverContentClassName="rounded-xl"
        content={
          <div className="flex w-full">
            <div className="scrollbar-hide flex w-full flex-col overflow-x-scroll sm:flex-row sm:items-start">
              <div className="scrollbar-hide overflow-x-scroll">
                <CalendarPrimitive
                  mode="range"
                  selected={range}
                  onSelect={onRangeChange}
                  month={month}
                  onMonthChange={setMonth}
                  numberOfMonths={isDesktop ? 2 : 1}
                  disabled={disabledDays}
                  disableNavigation={disableNavigation}
                  showYearNavigation={showYearNavigation}
                  locale={locale}
                  initialFocus
                  className="scrollbar-hide overflow-x-scroll"
                  classNames={{
                    months:
                      "flex flex-row divide-x divide-gray-300 overflow-x-scroll scrollbar-hide",
                  }}
                  {...props}
                />
                {showTimePicker && (
                  <div className="flex items-center justify-evenly gap-x-3 border-t border-gray-200 p-3">
                    <div className="flex flex-1 items-center gap-x-2">
                      <span className="text-gray-700">Start:</span>
                      <TimeInput
                        value={startTime}
                        onChange={(v) => onTimeChange(v, "start")}
                        aria-label="Start date time"
                        isDisabled={!range?.from}
                        isRequired={props.required}
                      />
                    </div>
                    <Minus className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="flex flex-1 items-center gap-x-2">
                      <span className="text-gray-700">End:</span>
                      <TimeInput
                        value={endTime}
                        onChange={(v) => onTimeChange(v, "end")}
                        aria-label="End date time"
                        isDisabled={!range?.to}
                        isRequired={props.required}
                      />
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-200 p-3 sm:flex sm:items-center sm:justify-end">
                  <div className="mt-2 flex items-center gap-x-2 sm:mt-0">
                    <Button
                      variant="secondary"
                      className="sm:h-8"
                      type="button"
                      onClick={onCancel}
                      text="Cancel"
                    />
                    <Button
                      variant="success"
                      className="sm:h-8"
                      type="button"
                      onClick={onApply}
                      text="Apply"
                    />
                  </div>
                </div>
              </div>
              {presets && presets.length > 0 && (
                <div
                  className={cn(
                    "relative flex h-16 w-full items-center sm:h-full sm:w-44",
                    "border-b border-gray-200 sm:border-b-0 sm:border-l",
                    "scrollbar-hide overflow-auto",
                  )}
                >
                  <div className="absolute px-3 sm:inset-0 sm:left-0 sm:p-3">
                    <Presets
                      currentValue={range}
                      presets={presets}
                      onSelect={onRangeChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      >
        <Trigger
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          hasError={hasError}
          aria-required={props.required || props["aria-required"]}
          aria-invalid={props["aria-invalid"]}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
        >
          {displayRange}
        </Trigger>
      </Popover>
    </DatePickerContext.Provider>
  );
};

export function DateRangePicker({ presets, ...props }: RangeDatePickerProps) {
  if (presets) validatePresets(presets, props);

  return <DateRangePickerInner presets={presets} {...props} />;
}
