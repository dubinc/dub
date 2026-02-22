"use client";

import { WebhookEventProps } from "@/lib/types";
import { Button, ButtonTooltip, Sheet, useCopyToClipboard } from "@dub/ui";
import { Copy } from "@dub/ui/icons";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { HighlighterCore } from "shiki";
import { toast } from "sonner";
import { X } from "../shared/icons";

interface WebhookEventDetailsSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: WebhookEventProps | null;
}

function WebhookEventDetailsSheetContent({
  event,
}: Omit<WebhookEventDetailsSheetProps, "isOpen" | "setIsOpen">) {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);
  const [responseBody, setResponseBody] = useState("");
  const [requestBody, setRequestBody] = useState("");

  useEffect(() => {
    import("shiki").then(({ createHighlighter }) => {
      createHighlighter({
        themes: ["min-light"],
        langs: ["json"],
      }).then(setHighlighter);
    });
  }, []);

  useEffect(() => {
    if (!highlighter || !event) return;

    const toHighlightedJson = (raw: string) => {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }

      const jsonStr = JSON.stringify(value, null, 2) ?? String(value);
      return highlighter.codeToHtml(jsonStr, {
        theme: "min-light",
        lang: "json",
      });
    };

    setResponseBody(toHighlightedJson(event.response_body));
    setRequestBody(toHighlightedJson(event.request_body));
  }, [highlighter, event]);

  const [, copyToClipboard] = useCopyToClipboard();

  if (!event) return null;

  return (
    <div className="flex size-full flex-col">
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
          <p className="font-mono text-sm text-neutral-500">{event.event_id}</p>
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
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="grid gap-4 border-t border-neutral-200 bg-white p-6">
          <h4 className="font-semibold">Response</h4>
          <div className="flex items-center gap-8">
            <p className="text-sm text-neutral-500">HTTP status code</p>
            <p className="text-sm text-neutral-700">{event.http_status}</p>
          </div>
          <div
            className="shiki-wrapper overflow-y-scroll text-sm"
            dangerouslySetInnerHTML={{ __html: responseBody }}
          />
        </div>
        <div className="grid gap-4 border-t border-neutral-200 bg-white p-6">
          <h4 className="font-semibold">Request</h4>
          <div
            className="shiki-wrapper overflow-y-scroll text-sm"
            dangerouslySetInnerHTML={{ __html: requestBody }}
          />
        </div>
      </div>
    </div>
  );
}

export function WebhookEventDetailsSheet({
  isOpen,
  setIsOpen,
  event,
}: WebhookEventDetailsSheetProps) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      contentProps={{ className: "md:w-[650px]" }}
    >
      <WebhookEventDetailsSheetContent event={event} />
    </Sheet>
  );
}

export function useWebhookEventDetailsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [event, setEvent] = useState<WebhookEventProps | null>(null);

  const openWithEvent = (e: WebhookEventProps) => {
    setEvent(e);
    setIsOpen(true);
  };

  return {
    webhookEventDetailsSheet: event ? (
      <WebhookEventDetailsSheet
        event={event}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    openWithEvent,
  };
}
