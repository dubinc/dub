"use client";

import { cn, formatDateTime } from "@dub/utils";

export function ActivityEvent({
  icon: Icon,
  children,
  timestamp,
  note,
  isLast = false,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  timestamp: string | Date | null | undefined;
  note?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex size-6 shrink-0 items-center justify-center">
          <Icon className="size-[18px] text-neutral-600" />
        </div>

        {!isLast && (
          <div
            className="mt-0.5 border-l border-neutral-300"
            style={{ height: "10px", width: "1px" }}
          />
        )}
      </div>

      <div
        className={cn("flex min-w-0 flex-1 flex-col gap-2", !isLast && "pb-4")}
      >
        <div className="flex items-center gap-2">
          {children}
          {timestamp && (
            <span className="ml-auto shrink-0 text-xs text-neutral-400">
              {formatDateTime(timestamp)}
            </span>
          )}
        </div>

        {note && <div>{note}</div>}
      </div>
    </div>
  );
}
