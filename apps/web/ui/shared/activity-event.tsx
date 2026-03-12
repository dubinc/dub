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
  note?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex size-7 shrink-0 items-center justify-center">
          <Icon className="size-[18px] text-neutral-600" />
        </div>
        {!isLast && (
          <div
            className="mt-1 flex-1 border-l border-neutral-300"
            style={{ borderWidth: "0 0 0 1px" }}
          />
        )}
      </div>

      <div
        className={cn("flex min-w-0 flex-1 flex-col gap-1", !isLast && "pb-4")}
      >
        <div className="flex items-center gap-2">
          {children}
          {timestamp && (
            <span className="ml-auto shrink-0 text-xs text-neutral-400">
              {formatDateTime(timestamp)}
            </span>
          )}
        </div>
        {note && <p className="text-sm text-neutral-500">{note}</p>}
      </div>
    </div>
  );
}
