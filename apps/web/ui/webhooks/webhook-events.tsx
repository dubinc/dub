"use client";

import { WebhookEventProps } from "@/lib/types";
import { CircleCheck, Clock4 } from "lucide-react";
import { PropsWithChildren } from "react";
import { useWebhookInfoModal } from "../modals/webhook-event-modal";

export type EventListProps = PropsWithChildren<{
  events: WebhookEventProps[];
}>;

const WebhookEvent = ({ event }: { event: WebhookEventProps }) => {
  const { setShowWebhookInfoModal, WebhookInfoModal } = useWebhookInfoModal({
    event,
  });

  const isSuccess = event.http_status >= 200 && event.http_status < 300;

  return (
    <>
      <WebhookInfoModal />
      <div
        onClick={() => setShowWebhookInfoModal(true)}
        className="flex cursor-pointer items-center justify-between gap-5 px-3.5 py-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            {isSuccess ? (
              <CircleCheck className="size-4 text-green-500" />
            ) : (
              <Clock4 className="size-4 text-red-500" />
            )}
            <div className="text-sm text-gray-500">{event.http_status}</div>
          </div>
          <div className="text-sm text-gray-500">{event.event}</div>
        </div>

        <div className="text-xs text-gray-400">
          {new Date(event.timestamp).toLocaleString()}
        </div>
      </div>
    </>
  );
};

export const WebhookEventList = ({ events }: EventListProps) => {
  return (
    <div className="rounded-md border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {events.map((event, index) => (
          <WebhookEvent key={index} event={event} />
        ))}
      </div>
    </div>
  );
};
