"use client";

import { PAGINATION_LIMIT } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";
import usePagination from "../analytics/events/use-pagination";

export type EventListProps = PropsWithChildren<{
  events: { icon: ReactNode; content: ReactNode; right?: ReactNode }[];
  totalEvents: number;
}>;

const buttonClassName = [
  "flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600",
  "outline-none hover:bg-gray-50 focus-visible:border-gray-500",
  "disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:bg-white",
].join(" ");

export function EventList({ events, totalEvents }: EventListProps) {
  const { pagination, setPagination } = usePagination(PAGINATION_LIMIT);
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
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-3.5 py-2 text-sm leading-6 text-gray-600">
        <div>
          <span className="hidden sm:inline-block">Viewing</span>{" "}
          <span className="font-medium">
            {pagination.pageIndex * pagination.pageSize + 1}-
            {Math.min(
              pagination.pageIndex * pagination.pageSize + pagination.pageSize,
              totalEvents,
            )}
          </span>{" "}
          of <span className="font-medium">{totalEvents}</span> events
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={buttonClassName}
            onClick={() =>
              setPagination({
                pageIndex: pagination.pageIndex - 1,
                pageSize: pagination.pageSize,
              })
            }
            disabled={pagination.pageIndex === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className={buttonClassName}
            onClick={() =>
              setPagination({
                pageIndex: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
              })
            }
            disabled={
              pagination.pageIndex * pagination.pageSize +
                pagination.pageSize >=
              totalEvents
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export function EventListSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {[...Array(5)].map((_, index) => (
          <div
            className="flex items-center justify-between gap-5 px-3.5 py-4"
            key={index}
          >
            <div className="flex items-center gap-2.5 text-gray-500">
              <div className="h-4 w-4 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
