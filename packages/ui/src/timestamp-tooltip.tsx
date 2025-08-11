"use client";

import { cn, timeAgo } from "@dub/utils";
import { Tooltip } from "./tooltip";

type TimestampInput = Date | string | number;

export interface TimestampTooltipProps {
  timestamp: TimestampInput;
  /**
   * If true, the inline display will only render the time (HH:mm:ss).
   * Useful for compact layouts on mobile.
   */
  timeOnly?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

function getLocalTimeZone(): string {
  if (typeof Intl !== "undefined") {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    } catch (e) {
      return "Local";
    }
  }
  return "Local";
}

function formatDisplay(date: Date, timeOnly?: boolean) {
  const time = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  if (timeOnly) return time;

  // Month (short, uppercase) + 2-digit day
  const datePart = date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
  return `${datePart} ${time}`;
}

export function TimestampTooltip({
  timestamp,
  timeOnly,
  className,
  side = "top",
  ...tooltipProps
}: TimestampTooltipProps) {
  const date = new Date(timestamp);

  const tz = getLocalTimeZone();

  const inlineText = formatDisplay(date, timeOnly);

  const commonFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  };

  const localText = date.toLocaleString("en-US", commonFormat);

  const utcText = new Date(date.getTime()).toLocaleString("en-US", {
    ...commonFormat,
    timeZone: "UTC",
  });

  const unixMs = date.getTime().toString();
  const relative = timeAgo(date, { withAgo: true });

  const rows: { label: string; value: string }[] = [
    { label: tz, value: localText },
    { label: "UTC", value: utcText },
    { label: "UNIX Timestamp", value: unixMs },
    { label: "Relative", value: relative },
  ];

  return (
    <Tooltip
      side={side}
      content={
        <div className="grid w-[360px] gap-2.5 px-4 py-3 text-left text-sm text-neutral-700">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[auto,1fr] items-baseline gap-x-4"
            >
              <span className="max-w-[170px] truncate text-xs text-neutral-400">
                {row.label}
              </span>
              <span className="whitespace-nowrap font-mono text-neutral-800">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      }
      {...tooltipProps}
    >
      <span className={cn("inline-block", className)} suppressHydrationWarning>
        {inlineText}
      </span>
    </Tooltip>
  );
}

export default TimestampTooltip;
