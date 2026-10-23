"use client";

import { WebhookEventProps } from "@/lib/types";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  CopyText,
  Sheet,
  useKeyboardShortcut,
} from "@dub/ui";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { HighlighterCore } from "shiki";
import { X } from "../shared/icons";

interface WebhookEventDetailsSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: WebhookEventProps | null;
  onNext?: () => void;
  onPrevious?: () => void;
}

function WebhookEventDetailsSheetContent({
  event,
  onPrevious,
  onNext,
}: Omit<WebhookEventDetailsSheetProps, "isOpen" | "setIsOpen">) {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);
  const [responseBody, setResponseBody] = useState("");
  const [requestBody, setRequestBody] = useState("");

  // right arrow key onNext
  useKeyboardShortcut(
    "ArrowRight",
    () => {
      if (onNext) {
        onNext();
      }
    },
    { sheet: true },
  );

  // left arrow key onPrevious
  useKeyboardShortcut(
    "ArrowLeft",
    () => {
      if (onPrevious) {
        onPrevious();
      }
    },
    { sheet: true },
  );

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

  if (!event) return null;

  return (
    <div className="flex size-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="flex flex-col">
          <p className="text-lg font-semibold">{event.event}</p>
          <CopyText
            value={event.event_id}
            className="truncate font-mono text-xs text-neutral-400 transition-colors hover:text-neutral-600"
          >
            {event.event_id}
          </CopyText>
        </Sheet.Title>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Button
              type="button"
              disabled={!onPrevious}
              onClick={onPrevious}
              variant="secondary"
              className="size-9 rounded-l-lg rounded-r-none p-0"
              icon={<ChevronLeft className="size-3.5" />}
            />
            <Button
              type="button"
              disabled={!onNext}
              onClick={onNext}
              variant="secondary"
              className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
              icon={<ChevronRight className="size-3.5" />}
            />
          </div>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="grid gap-4 bg-white p-6">
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
  onNext,
  onPrevious,
}: WebhookEventDetailsSheetProps) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      contentProps={{ className: "md:w-[650px]" }}
    >
      <WebhookEventDetailsSheetContent
        event={event}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    </Sheet>
  );
}
