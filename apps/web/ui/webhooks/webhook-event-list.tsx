"use client";

import { WebhookEventProps } from "@/lib/types";
import { TimestampTooltip, Tooltip } from "@dub/ui";
import { CircleCheck, CircleHalfDottedClock } from "@dub/ui/icons";
import { formatDateTimeSmart } from "@dub/utils";
import { PropsWithChildren } from "react";

export type WebhookEventListProps = PropsWithChildren<{
  events: WebhookEventProps[];
  onEventClick: (event: WebhookEventProps) => void;
  selectedEventId?: string | null;
}>;

const WebhookEventRow = ({
  event,
  onClick,
  isSelected,
}: {
  event: WebhookEventProps;
  onClick: () => void;
  isSelected?: boolean;
}) => {
  const isSuccess = event.http_status >= 200 && event.http_status < 300;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-5 px-3.5 py-3 focus:outline-none ${
        isSelected ? "bg-neutral-50" : "hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <Tooltip
            content={
              isSuccess
                ? "This webhook was successfully delivered."
                : "This webhook failed to deliver – it will be retried."
            }
          >
            <div>
              {isSuccess ? (
                <CircleCheck className="size-4 text-green-500" />
              ) : (
                <CircleHalfDottedClock className="size-4 text-amber-500" />
              )}
            </div>
          </Tooltip>
          <div className="text-sm text-neutral-500">{event.http_status}</div>
        </div>
        <div className="text-sm text-neutral-500">{event.event}</div>
      </div>

      <TimestampTooltip
        timestamp={event.timestamp}
        side="right"
        rows={["local", "utc", "unix"]}
      >
        <div className="text-xs text-neutral-400">
          {formatDateTimeSmart(event.timestamp)}
        </div>
      </TimestampTooltip>
    </button>
  );
};

export const WebhookEventList = ({
  events,
  onEventClick,
  selectedEventId,
}: WebhookEventListProps) => {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <div className="flex flex-col divide-y divide-neutral-200">
        {events.map((event) => (
          <WebhookEventRow
            key={event.event_id}
            event={event}
            onClick={() => onEventClick(event)}
            isSelected={selectedEventId === event.event_id}
          />
        ))}
      </div>
    </div>
  );
};
