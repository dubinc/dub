import { enUS } from "date-fns/locale";
import { ReactElement, useEffect, useState } from "react";
import { Popover } from "../popover";
import { Calendar as CalendarPrimitive } from "./calendar";
import { DatePickerContext, formatDate } from "./shared";
import { Trigger } from "./trigger";
import { PickerProps } from "./types";

export type DatePickerTriggerRenderProps = {
  displayValue: string | null;
  placeholder: string;
  open: boolean;
  disabled?: boolean;
  invalid?: boolean;
};

export type DatePickerProps = {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | undefined) => void;
  /** Custom trigger element. Receives displayValue, placeholder, open, and disabled. Must return a single React element (e.g. <button>) so the popover can attach open behavior. */
  trigger?: (props: DatePickerTriggerRenderProps) => ReactElement;
  invalid?: boolean;
} & PickerProps;

export function DatePicker({
  value,
  defaultValue,
  onChange,
  trigger: customTrigger,
  disabled,
  disableNavigation,
  disabledDays,
  showYearNavigation = false,
  locale = enUS,
  placeholder = "Select date",
  hasError,
  invalid,
  align = "center",
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(
    value ?? defaultValue ?? undefined,
  );

  useEffect(() => {
    setSelected(value ?? undefined);
  }, [value]);

  const onSelect = (date: Date | undefined) => {
    setSelected(date);
    onChange?.(date);
    setOpen(false);
  };

  const displayValue = selected ? formatDate(selected, locale) : null;

  return (
    <DatePickerContext.Provider value={{ isOpen: open, setIsOpen: setOpen }}>
      <Popover
        align={align}
        openPopover={open}
        setOpenPopover={setOpen}
        popoverContentClassName="rounded-xl"
        content={
          <div className="flex w-full">
            <CalendarPrimitive
              mode="single"
              selected={selected}
              onSelect={onSelect}
              disabled={disabledDays}
              disableNavigation={disableNavigation}
              showYearNavigation={showYearNavigation}
              locale={locale}
              className="p-3"
              {...props}
            />
          </div>
        }
      >
        {customTrigger ? (
          customTrigger({
            displayValue,
            placeholder,
            open,
            disabled,
            invalid,
          })
        ) : (
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
            {displayValue}
          </Trigger>
        )}
      </Popover>
    </DatePickerContext.Provider>
  );
}
