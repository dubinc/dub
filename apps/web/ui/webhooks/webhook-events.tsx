"use client";

import { WebhookEventProps } from "@/lib/types";
import { Button, Sheet, useCopyToClipboard, useMediaQuery } from "@dub/ui";
import { CircleCheck, CircleHalfDottedClock, Copy } from "@dub/ui/src/icons";
import { ButtonTooltip, Tooltip } from "@dub/ui/src/tooltip";
import { PropsWithChildren, useEffect, useState } from "react";
import { Highlighter } from "shiki";
import { toast } from "sonner";
import { X } from "../shared/icons";

export type EventListProps = PropsWithChildren<{
  events: WebhookEventProps[];
}>;

const WebhookEvent = ({ event }: { event: WebhookEventProps }) => {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [responseBody, setResponseBody] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("");

  useEffect(() => {
    import("shiki").then(({ getHighlighter }) => {
      getHighlighter({
        themes: ["min-light"],
        langs: ["json"],
      }).then(setHighlighter);
    });
  }, []);

  useEffect(() => {
    if (highlighter) {
      const responseBodyHtml = highlighter.codeToHtml(
        JSON.stringify(event.response_body, null, 2),
        {
          theme: "min-light",
          lang: "json",
        },
      );
      setResponseBody(responseBodyHtml);
      const requestBodyHtml = highlighter.codeToHtml(
        JSON.stringify(event.request_body, null, 2),
        {
          theme: "min-light",
          lang: "json",
        },
      );
      setRequestBody(requestBodyHtml);
    }
  }, [highlighter, event]);

  const [, copyToClipboard] = useCopyToClipboard();

  const isSuccess = event.http_status >= 200 && event.http_status < 300;
  const { isMobile } = useMediaQuery();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between gap-5 px-3.5 py-3 hover:bg-gray-50 focus:outline-none"
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
            <div className="text-sm text-gray-500">{event.http_status}</div>
          </div>
          <div className="text-sm text-gray-500">{event.event}</div>
        </div>

        <div className="text-xs text-gray-400">
          {(() => {
            const date = new Date(event.timestamp);
            const localDate = new Date(
              date.getTime() - date.getTimezoneOffset() * 60000,
            );
            return isMobile
              ? localDate.toLocaleTimeString()
              : localDate.toLocaleString();
          })()}
        </div>
      </button>
      <Sheet
        open={isOpen}
        onOpenChange={setIsOpen}
        contentProps={{ className: "md:w-[650px]" }}
        handleOnly
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <Sheet.Title className="text-lg font-semibold">
              {event.event}
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
          <div className="group flex items-center gap-2">
            <p className="font-mono text-sm text-gray-500">{event.event_id}</p>
            <ButtonTooltip
              tooltipProps={{
                content: "Copy event ID",
              }}
              onClick={() =>
                toast.promise(copyToClipboard(event.event_id), {
                  success: "Copied to clipboard",
                })
              }
            >
              <Copy className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </ButtonTooltip>
          </div>
        </div>
        <div className="grid gap-4 border-t border-gray-200 bg-white p-6">
          <h4 className="font-semibold">Response</h4>
          <div className="flex items-center gap-8">
            <p className="text-sm text-gray-500">HTTP status code</p>
            <p className="text-sm text-gray-700">{event.http_status}</p>
          </div>
          <div
            className="shiki-wrapper overflow-y-scroll text-sm"
            dangerouslySetInnerHTML={{ __html: responseBody }}
          />
        </div>
        <div className="grid gap-4 border-t border-gray-200 bg-white p-6">
          <h4 className="font-semibold">Request</h4>
          <div
            className="shiki-wrapper overflow-y-scroll text-sm"
            dangerouslySetInnerHTML={{ __html: requestBody }}
          />
        </div>
      </Sheet>
    </>
  );
};

export const WebhookEventList = ({ events }: EventListProps) => {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {events.map((event, index) => (
          <WebhookEvent key={index} event={event} />
        ))}
      </div>
    </div>
  );
};
