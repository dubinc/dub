import {
  DATE_RANGE_INTERVAL_PRESETS,
  INTERVAL_DISPLAYS,
} from "@/lib/analytics/constants";
import { getIntervalData } from "@/lib/analytics/utils";
import { DateRangePicker, useRouterStuff } from "@dub/ui";

type Values = {
  start?: string;
  end?: string;
  interval?: string;
};

export default function SimpleDateRangePicker({
  className,
  align = "center",
  defaultInterval = "30d",
  values,
  disabled,
  presets,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  defaultInterval?: string;
  values?: Values;
  disabled?: boolean;
  presets?: (typeof DATE_RANGE_INTERVAL_PRESETS)[number][];
}) {
  const { queryParams, searchParamsObj } = useRouterStuff();
  const { start, end, interval } = values ?? (searchParamsObj as Values);

  return (
    <DateRangePicker
      className={className}
      align={align}
      value={
        start && end
          ? {
              from: new Date(start),
              to: new Date(end),
            }
          : undefined
      }
      presetId={!start || !end ? interval ?? defaultInterval : undefined}
      onChange={(range, preset) => {
        if (preset) {
          queryParams({
            del: ["start", "end"],
            set: {
              interval: preset.id,
            },
            scroll: false,
          });

          return;
        }

        // Regular range
        if (!range || !range.from || !range.to) return;

        queryParams({
          del: "interval",
          set: {
            start: range.from.toISOString(),
            end: range.to.toISOString(),
          },
          scroll: false,
        });
      }}
      presets={(presets
        ? INTERVAL_DISPLAYS.filter(({ value }) =>
            (presets as string[]).includes(value),
          )
        : INTERVAL_DISPLAYS
      ).map(({ display, value, shortcut }) => {
        const start = getIntervalData(value).startDate;
        const end = new Date();

        return {
          id: value,
          label: display,
          dateRange: {
            from: start,
            to: end,
          },
          shortcut,
        };
      })}
      disabled={disabled}
    />
  );
}
