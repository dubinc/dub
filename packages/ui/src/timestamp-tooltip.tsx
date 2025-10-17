"use client";

import { cn } from "@dub/utils";
import { formatDuration, intervalToDuration } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipProps } from "./tooltip";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

export type TimestampTooltipProps = {
  timestamp: Date | string | number | null | undefined;
  rows?: ("local" | "utc" | "unix")[];
  interactive?: boolean;
  className?: string;
} & Omit<TooltipProps, "content">;

function getLocalTimeZone(): string {
  if (typeof Intl !== "undefined") {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    } catch (e) {}
  }
  return "Local";
}

export function TimestampTooltip({
  timestamp,
  rows,
  interactive,
  ...tooltipProps
}: TimestampTooltipProps) {
  if (!timestamp || new Date(timestamp).toString() === "Invalid Date")
    return tooltipProps.children;

  return (
    <Tooltip
      content={
        <TimestampTooltipContent
          timestamp={timestamp}
          rows={rows}
          interactive={interactive}
        />
      }
      disableHoverableContent={!interactive}
      {...tooltipProps}
    />
  );
}

function TimestampTooltipContent({
  timestamp,
  rows = ["local", "utc"],
  interactive = false,
}: Pick<TimestampTooltipProps, "timestamp" | "rows" | "interactive">) {
  if (!timestamp)
    throw new Error("Falsy timestamp not permitted in TimestampTooltipContent");

  const date = new Date(timestamp);

  const commonFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  };

  const diff = new Date().getTime() - date.getTime();
  const relativeDuration = intervalToDuration({
    start: date,
    end: new Date(),
  });
  const relative =
    formatDuration(relativeDuration, {
      delimiter: ", ",
      format: [
        "years",
        "months",
        "days",
        ...(diff < MONTH_MS
          ? [
              "hours" as const,
              ...(diff < DAY_MS
                ? ["minutes" as const, "seconds" as const]
                : []),
            ]
          : []),
      ],
    }) + " ago";

  const items: {
    label: string;
    shortLabel?: string;
    value: string;
    valueMono?: boolean;
  }[] = useMemo(
    () =>
      rows.map(
        (key) =>
          ({
            local: {
              label: getLocalTimeZone(),
              shortLabel: new Date()
                .toLocaleTimeString("en-US", { timeZoneName: "short" })
                .split(" ")[2],
              value: date.toLocaleString("en-US", commonFormat),
            },

            utc: {
              label: "UTC",
              shortLabel: "UTC",
              value: new Date(date.getTime()).toLocaleString("en-US", {
                ...commonFormat,
                timeZone: "UTC",
              }),
            },

            unix: {
              label: "UNIX Timestamp",
              value: (date.getTime() / 1000).toString(),
              valueMono: true,
            },
          })[key]!,
      ),
    [rows, date],
  );

  const shortLabels = items.every(({ shortLabel }) => shortLabel);

  // Re-render every second to update the relative time
  const [_, setRenderCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setRenderCount((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex max-w-[360px] flex-col gap-2 px-2.5 py-2 text-left text-xs">
      {diff > 0 && (
        <span className="text-content-subtle cursor-default">{relative}</span>
      )}
      <table>
        {items.map((row, idx) => (
          <tr
            key={idx}
            className={cn(
              interactive &&
                "before:bg-bg-emphasis relative select-none before:absolute before:-inset-x-1 before:inset-y-0 before:rounded before:opacity-0 before:content-[''] hover:cursor-pointer hover:before:opacity-60 active:before:opacity-100",
            )}
            onClick={
              interactive
                ? async () => {
                    try {
                      await navigator.clipboard.writeText(row.value);
                      toast.success("Copied to clipboard");
                    } catch (e) {
                      toast.error("Failed to copy to clipboard");
                      console.error("Failed to copy to clipboard", e);
                    }
                  }
                : undefined
            }
          >
            <td className="relative py-0.5">
              <span
                className={cn(
                  "text-content-subtle truncate",
                  shortLabels && "bg-bg-inverted/10 rounded px-1 font-mono",
                )}
                title={shortLabels ? row.label : undefined}
              >
                {shortLabels ? row.shortLabel : row.label}
              </span>
            </td>
            <td
              className={cn(
                "text-content-default relative whitespace-nowrap py-0.5 pl-3",
                shortLabels && "pl-2",
                row.valueMono && "font-mono",
              )}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}

export default TimestampTooltip;
