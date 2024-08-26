"use client";

import { WebhookEventProps } from "@/lib/types";
import { CircleCheck, Clock4 } from "lucide-react";
import { PropsWithChildren } from "react";

export type EventListProps = PropsWithChildren<{
  events: WebhookEventProps[];
  totalEvents: number;
}>;

const isSuccess = (status: number) => status >= 200 && status < 300;

export function WebhookEventList({ events, totalEvents }: EventListProps) {
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
    </div>
  );
}
