import { Locale } from "date-fns";
import { ReactNode } from "react";
import { Matcher } from "react-day-picker";
import { PopoverProps } from "../popover";

export type CalendarProps = {
  fromYear?: number;
  toYear?: number;
  fromMonth?: Date;
  toMonth?: Date;
  fromDay?: Date;
  toDay?: Date;
  fromDate?: Date;
  toDate?: Date;
  locale?: Locale;
};

export interface PickerProps extends CalendarProps {
  className?: string;
  disabled?: boolean;
  disabledDays?: Matcher | Matcher[] | undefined;
  required?: boolean;
  showTimePicker?: boolean;
  placeholder?: string;
  showYearNavigation?: boolean;
  disableNavigation?: boolean;
  hasError?: boolean;
  id?: string;
  align?: PopoverProps["align"];
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-required"?: boolean;
}

export type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};

export interface Preset {
  id: string;
  label: string;
  requiresUpgrade?: boolean;
  tooltipContent?: ReactNode;
  shortcut?: string;
}

export interface DatePreset extends Preset {
  date: Date;
}

export interface DateRangePreset extends Preset {
  dateRange: DateRange;
}
