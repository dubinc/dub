import { cn } from "@dub/utils";
import { addYears, format, isSameMonth } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { ElementType, HTMLAttributes, forwardRef, useRef } from "react";
import {
  DayPicker,
  useDayPicker,
  useDayRender,
  useNavigation,
  type DayPickerRangeProps,
  type DayPickerSingleProps,
  type DayProps,
  type Matcher,
} from "react-day-picker";

interface NavigationButtonProps extends HTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
  icon: ElementType;
  disabled?: boolean;
}

const NavigationButton = forwardRef<HTMLButtonElement, NavigationButtonProps>(
  (
    { onClick, icon: Icon, disabled, ...props }: NavigationButtonProps,
    forwardedRef,
  ) => {
    return (
      <button
        ref={forwardedRef}
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-7 w-7 shrink-0 select-none items-center justify-center rounded border p-1 outline-none transition",
          "border-gray-200 text-gray-600 hover:text-gray-800",
          "hover:bg-gray-50 active:bg-gray-100",
          "disabled:pointer-events-none disabled:text-gray-400",
        )}
        onClick={onClick}
        {...props}
      >
        <Icon className="h-full w-full shrink-0" />
      </button>
    );
  },
);

NavigationButton.displayName = "NavigationButton";

type OmitKeys<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};

type KeysToOmit = "showWeekNumber" | "captionLayout" | "mode";

type SingleProps = OmitKeys<DayPickerSingleProps, KeysToOmit>;
type RangeProps = OmitKeys<DayPickerRangeProps, KeysToOmit>;

type CalendarProps =
  | ({
      mode: "single";
    } & SingleProps)
  | ({
      mode?: undefined;
    } & SingleProps)
  | ({
      mode: "range";
    } & RangeProps);

function Calendar({
  mode = "single",
  weekStartsOn = 1,
  numberOfMonths = 1,
  showYearNavigation = false,
  disableNavigation,
  locale,
  className,
  classNames,
  ...props
}: CalendarProps & { showYearNavigation?: boolean }) {
  return (
    <DayPicker
      mode={mode}
      weekStartsOn={weekStartsOn}
      numberOfMonths={numberOfMonths}
      locale={locale}
      showOutsideDays={numberOfMonths === 1 ? true : false}
      className={className}
      classNames={{
        months: "flex space-y-0",
        month: "space-y-4 p-3 w-full",
        nav: "gap-1 flex items-center rounded-full w-full h-full justify-between p-4",
        table: "w-full border-separate border-spacing-y-1",
        head_cell: "w-9 font-medium text-xs text-center text-gray-400 pb-2",
        row: "w-full",
        cell: "relative p-0 text-center focus-within:relative text-gray-900",
        day: cn(
          "relative h-10 w-full sm:h-9 sm:w-9 rounded-md text-sm text-gray-900",
          "hover:bg-gray-100 active:bg-gray-200 outline outline-offset-2 outline-0 focus-visible:outline-2 outline-blue-500",
        ),
        day_today: "font-semibold",
        day_selected:
          "rounded aria-selected:bg-blue-500 aria-selected:text-white",
        day_disabled:
          "!text-gray-300 line-through disabled:hover:bg-transparent",
        day_outside: "text-gray-400",
        day_range_middle:
          "!rounded-none aria-selected:!bg-blue-100 aria-selected:!text-blue-900",
        day_range_start: "rounded-r-none !rounded-l",
        day_range_end: "rounded-l-none !rounded-r",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        Caption: ({ ...props }) => {
          const {
            goToMonth,
            nextMonth,
            previousMonth,
            currentMonth,
            displayMonths,
          } = useNavigation();
          const { numberOfMonths, fromDate, toDate } = useDayPicker();

          const displayIndex = displayMonths.findIndex((month) =>
            isSameMonth(props.displayMonth, month),
          );
          const isFirst = displayIndex === 0;
          const isLast = displayIndex === displayMonths.length - 1;

          const hideNextButton = numberOfMonths > 1 && (isFirst || !isLast);
          const hidePreviousButton = numberOfMonths > 1 && (isLast || !isFirst);

          const goToPreviousYear = () => {
            const targetMonth = addYears(currentMonth, -1);
            if (
              previousMonth &&
              (!fromDate || targetMonth.getTime() >= fromDate.getTime())
            ) {
              goToMonth(targetMonth);
            }
          };

          const goToNextYear = () => {
            const targetMonth = addYears(currentMonth, 1);
            if (
              nextMonth &&
              (!toDate || targetMonth.getTime() <= toDate.getTime())
            ) {
              goToMonth(targetMonth);
            }
          };

          return (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {showYearNavigation && !hidePreviousButton && (
                  <NavigationButton
                    disabled={
                      disableNavigation ||
                      !previousMonth ||
                      (fromDate &&
                        addYears(currentMonth, -1).getTime() <
                          fromDate.getTime())
                    }
                    aria-label="Go to previous year"
                    onClick={goToPreviousYear}
                    icon={ChevronsLeft}
                  />
                )}
                {!hidePreviousButton && (
                  <NavigationButton
                    disabled={disableNavigation || !previousMonth}
                    aria-label="Go to previous month"
                    onClick={() => previousMonth && goToMonth(previousMonth)}
                    icon={ChevronLeft}
                  />
                )}
              </div>

              <div
                role="presentation"
                aria-live="polite"
                className="text-sm font-medium capitalize tabular-nums text-gray-900"
              >
                {format(props.displayMonth, "LLLL yyy", { locale })}
              </div>

              <div className="flex items-center gap-1">
                {!hideNextButton && (
                  <NavigationButton
                    disabled={disableNavigation || !nextMonth}
                    aria-label="Go to next month"
                    onClick={() => nextMonth && goToMonth(nextMonth)}
                    icon={ChevronRight}
                  />
                )}
                {showYearNavigation && !hideNextButton && (
                  <NavigationButton
                    disabled={
                      disableNavigation ||
                      !nextMonth ||
                      (toDate &&
                        addYears(currentMonth, 1).getTime() > toDate.getTime())
                    }
                    aria-label="Go to next year"
                    onClick={goToNextYear}
                    icon={ChevronsRight}
                  />
                )}
              </div>
            </div>
          );
        },
        Day: ({ date, displayMonth }: DayProps) => {
          const buttonRef = useRef<HTMLButtonElement>(null);
          const { activeModifiers, buttonProps, divProps, isButton, isHidden } =
            useDayRender(date, displayMonth, buttonRef);

          const { selected, today, disabled, range_middle } = activeModifiers;

          if (isHidden) return <></>;

          if (!isButton) {
            return (
              <div
                {...divProps}
                className={cn(
                  "flex items-center justify-center",
                  divProps.className,
                )}
              />
            );
          }

          const { children: buttonChildren, ...buttonPropsRest } = buttonProps;

          return (
            <button ref={buttonRef} {...buttonPropsRest} type="button">
              {buttonChildren}
              {today && (
                <span
                  className={cn(
                    "absolute inset-x-1/2 bottom-1.5 h-0.5 w-4 -translate-x-1/2 rounded-[2px]",
                    {
                      "bg-blue-500": !selected,
                      "!bg-white": selected,
                      "!bg-blue-400": selected && range_middle,
                      "text-gray-400": disabled,
                    },
                  )}
                />
              )}
            </button>
          );
        },
      }}
      {...(props as SingleProps & RangeProps)}
    />
  );
}

export { Calendar, type Matcher };
