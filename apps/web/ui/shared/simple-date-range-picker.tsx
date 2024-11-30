import { INTERVAL_DATA, INTERVAL_DISPLAYS } from "@/lib/analytics/constants";
import { DateRangePicker, useRouterStuff } from "@dub/ui";

export default function SimpleDateRangePicker({
  className,
  align = "center",
}: {
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const { queryParams, searchParamsObj } = useRouterStuff();
  const { start, end, interval } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: string;
  };

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
      presetId={!start || !end ? interval ?? "30d" : undefined}
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
      presets={INTERVAL_DISPLAYS.map(({ display, value, shortcut }) => {
        const start = INTERVAL_DATA[value].startDate;
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
    />
  );
}
