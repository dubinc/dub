"use client";

import { PropsWithChildren, ReactNode } from "react";

export type EventListProps = PropsWithChildren<{
  events: { icon: ReactNode; content: ReactNode; right?: ReactNode }[];
  hasNext?: boolean;
  hasPrevious?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}>;

const buttonClassName = [
  "flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600",
  "outline-none hover:bg-gray-50 focus-visible:border-gray-500",
  "disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:bg-white",
].join(" ");

export function EventList({
  events,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
}: EventListProps) {
  return (
    <div className="rounded-xl border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {events.map((event, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-5 px-3.5 py-4"
          >
            <div className="flex items-center gap-2.5 text-gray-500">
              <div>{event.icon}</div>
              <div className="text-xs">{event.content}</div>
            </div>
            {event.right !== undefined && (
              <div className="text-xs text-gray-400">{event.right}</div>
            )}
          </div>
        ))}
      </div>
      {onPrevious && onNext && (
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-3.5 py-2">
          {onPrevious && (
            <button
              type="button"
              className={buttonClassName}
              onClick={onPrevious}
              disabled={!hasPrevious}
            >
              Previous
            </button>
          )}
          {onNext && (
            <button
              type="button"
              className={buttonClassName}
              onClick={onNext}
              disabled={!hasNext}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
