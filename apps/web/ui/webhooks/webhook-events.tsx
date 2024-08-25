"use client";

import { WebhookEventProps } from "@/lib/types";
import { usePagination } from "@dub/ui/src/hooks/use-pagination";
import { nFormatter, PAGINATION_LIMIT } from "@dub/utils";
import { CircleCheck, Clock4 } from "lucide-react";
import { PropsWithChildren } from "react";

export type EventListProps = PropsWithChildren<{
  events: WebhookEventProps[];
  totalEvents: number;
}>;

const buttonClassName = [
  "flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600",
  "outline-none hover:bg-gray-50 focus-visible:border-gray-500",
  "disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:bg-white",
].join(" ");

const isSuccess = (status: number) => status >= 200 && status < 300;

export function WebhookEventList({ events, totalEvents }: EventListProps) {
  const { pagination, setPagination } = usePagination(PAGINATION_LIMIT);

  return (
    <div className="rounded-xl border border-gray-200">
      {/* Webhook Events */}
      <div className="flex flex-col divide-y divide-gray-200">
        {events.map((event, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-5 px-3.5 py-4"
          >
            <div className="flex items-center gap-2.5">
              <div>
                {isSuccess(event.http_status) ? (
                  <CircleCheck className="size-4 text-green-500" />
                ) : (
                  <Clock4 className="size-4 text-red-500" />
                )}
              </div>
              <div className="text-sm text-gray-500">{event.event}</div>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-b-[inherit] border-t border-gray-200 bg-white px-3.5 py-2 text-sm leading-6 text-gray-600">
        <div>
          <span className="hidden sm:inline-block">Viewing</span>{" "}
          <span className="font-medium">
            {pagination.pageIndex * pagination.pageSize + 1}-
            {Math.min(
              pagination.pageIndex * pagination.pageSize + pagination.pageSize,
              totalEvents,
            )}
          </span>{" "}
          of{" "}
          <span className="font-medium">
            {nFormatter(totalEvents, { full: true })}
          </span>{" "}
          events
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
