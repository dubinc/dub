import { cn } from "@dub/utils";
import {
  AriaTimeFieldProps,
  TimeValue,
  useDateSegment,
  useTimeField,
} from "@react-aria/datepicker";
import {
  DateFieldState,
  DateSegment,
  useTimeFieldState,
} from "@react-stately/datepicker";
import { forwardRef, useImperativeHandle, useRef } from "react";

type TimeSegmentProps = {
  segment: DateSegment;
  state: DateFieldState;
};

const TimeSegment = ({ segment, state }: TimeSegmentProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const { segmentProps } = useDateSegment(segment, state, ref);

  const isColon = segment.type === "literal" && segment.text === ":";
  const isSpace = segment.type === "literal" && segment.text === " ";

  const isDecorator = isColon || isSpace;

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={cn(
        "relative block w-full appearance-none rounded-md border px-2.5 py-1.5 text-left uppercase tabular-nums shadow-sm outline-none sm:text-sm",
        "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
        //"invalid:border-red-500 invalid:ring-2 invalid:ring-red-200 group-aria-[invalid=true]/time-input:border-red-500 group-aria-[invalid=true]/time-input:ring-2 group-aria-[invalid=true]/time-input:ring-red-200",
        {
          "!w-fit border-none bg-transparent px-0 text-gray-400 shadow-none":
            isDecorator,
          hidden: isSpace,
          "border-gray-200 bg-gray-100 text-gray-400": state.isDisabled,
          "!bg-transparent !text-gray-400": !segment.isEditable,
        },
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block w-full text-left text-gray-700 sm:text-sm",
          {
            hidden: !segment.isPlaceholder,
            "h-0": !segment.isPlaceholder,
          },
        )}
      >
        {segment.placeholder}
      </span>
      {segment.isPlaceholder ? "" : segment.text}
    </div>
  );
};

type TimeInputProps = Omit<
  AriaTimeFieldProps<TimeValue>,
  "label" | "shouldForceLeadingZeros" | "description" | "errorMessage"
>;

const TimeInput = forwardRef<HTMLDivElement, TimeInputProps>(
  ({ hourCycle, ...props }: TimeInputProps, ref) => {
    const innerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      ref,
      () => innerRef?.current,
    );

    const locale = window !== undefined ? window.navigator.language : "en-US";

    const state = useTimeFieldState({
      hourCycle: hourCycle,
      locale: locale,
      shouldForceLeadingZeros: true,
      autoFocus: true,
      ...props,
    });

    const { fieldProps } = useTimeField(
      {
        ...props,
        hourCycle: hourCycle,
        shouldForceLeadingZeros: true,
      },
      state,
      innerRef,
    );

    return (
      <div
        {...fieldProps}
        ref={innerRef}
        className="group/time-input inline-flex w-full gap-x-2"
      >
        {state.segments.map((segment, i) => (
          <TimeSegment key={i} segment={segment} state={state} />
        ))}
      </div>
    );
  },
);
TimeInput.displayName = "TimeInput";

export { TimeInput };
