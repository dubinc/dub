import { cn } from "@dub/utils";
import { Time } from "@internationalized/date";
import { TimeValue } from "@react-aria/datepicker";
import { enUS } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../button";
import { Popover } from "../popover";
import { Calendar as CalendarPrimitive } from "./calendar";
import { Presets } from "./presets";
import { TimeInput } from "./time-input";
import { Trigger } from "./trigger";
import { DatePreset, PickerProps } from "./types";
import { formatDate, validatePresets } from "./utils";

type DatePickerProps = {
  presets?: DatePreset[];
  defaultValue?: Date;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
} & PickerProps;

const DatePickerInner = ({
  defaultValue,
  value,
  onChange,
  presets,
  disabled,
  disabledDays,
  disableNavigation,
  className,
  showTimePicker,
  placeholder = "Select date",
  hasError,
  showYearNavigation = false,
  locale = enUS,
  align = "center",
  ...props
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    value ?? defaultValue ?? undefined,
  );
  const [month, setMonth] = useState<Date | undefined>(date);

  const [time, setTime] = useState<TimeValue>(
    value
      ? new Time(value.getHours(), value.getMinutes())
      : defaultValue
        ? new Time(defaultValue.getHours(), defaultValue.getMinutes())
        : new Time(0, 0),
  );

  const initialDate = useMemo(() => {
    return date;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setDate(value ?? defaultValue ?? undefined);
  }, [value, defaultValue]);

  useEffect(() => {
    if (date) {
      setMonth(date);
    }
  }, [date]);

  useEffect(() => {
    if (!open) {
      setMonth(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onCancel = () => {
    setDate(initialDate);
    setTime(
      initialDate
        ? new Time(initialDate.getHours(), initialDate.getMinutes())
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

  const onDateChange = (date: Date | undefined) => {
    const newDate = date;
    if (showTimePicker) {
      if (newDate && !time) {
        setTime(new Time(0, 0));
      }
      if (newDate && time) {
        newDate.setHours(time.hour);
        newDate.setMinutes(time.minute);
      }
    }
    setDate(newDate);
  };

  const onTimeChange = (time: TimeValue) => {
    setTime(time);

    if (!date) {
      return;
    }

    const newDate = new Date(date.getTime());

    if (!time) {
      newDate.setHours(0);
      newDate.setMinutes(0);
    } else {
      newDate.setHours(time.hour);
      newDate.setMinutes(time.minute);
    }

    setDate(newDate);
  };

  const formattedDate = useMemo(() => {
    if (!date) {
      return null;
    }

    return formatDate(
      date,
      locale,
      showTimePicker,
      date.getFullYear() !== new Date().getFullYear(),
    );
  }, [date, locale, showTimePicker]);

  const onApply = () => {
    setOpen(false);
    onChange?.(date);
  };

  useEffect(() => {
    setDate(value ?? defaultValue ?? undefined);
    setTime(
      value
        ? new Time(value.getHours(), value.getMinutes())
        : defaultValue
          ? new Time(defaultValue.getHours(), defaultValue.getMinutes())
          : new Time(0, 0),
    );
  }, [value, defaultValue]);

  return (
    <Popover
      align={align}
      openPopover={open}
      setOpenPopover={onOpenChange}
      content={
        <div className="flex w-full">
          <div className="flex w-full flex-col sm:flex-row sm:items-start">
            {presets && presets.length > 0 && (
              <div
                className={cn(
                  "relative flex h-14 w-full items-center sm:h-full sm:w-40",
                  "border-b border-gray-200 sm:border-b-0 sm:border-r",
                  "overflow-auto",
                )}
              >
                <div className="absolute px-2 pr-2 sm:inset-0 sm:left-0 sm:py-2">
                  <Presets
                    currentValue={date}
                    presets={presets}
                    onSelect={onDateChange}
                  />
                </div>
              </div>
            )}
            <div>
              <CalendarPrimitive
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={date}
                onSelect={onDateChange}
                disabled={disabledDays}
                locale={locale}
                showYearNavigation={showYearNavigation}
                disableNavigation={disableNavigation}
                initialFocus
                {...props}
              />
              {showTimePicker && (
                <div className="border-t border-gray-200 p-3">
                  <TimeInput
                    aria-label="Time"
                    onChange={onTimeChange}
                    isDisabled={!date}
                    value={time}
                    isRequired={props.required}
                  />
                </div>
              )}
              <div className="flex items-center gap-x-2 border-t border-gray-200 p-3">
                <Button
                  variant="secondary"
                  className="sm:h-8"
                  type="button"
                  onClick={onCancel}
                  text="Cancel"
                />
                <Button
                  variant="primary"
                  className="sm:h-8"
                  type="button"
                  onClick={onApply}
                  text="Apply"
                />
              </div>
            </div>
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
        {formattedDate}
      </Trigger>
    </Popover>
  );
};

export function DatePicker({ presets, ...props }: DatePickerProps) {
  if (presets) validatePresets(presets, props);

  return <DatePickerInner presets={presets} {...props} />;
}
