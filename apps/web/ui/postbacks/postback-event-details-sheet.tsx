"use client";

import { PostbackEventProps } from "@/lib/types";
import { Button, ButtonTooltip, Sheet, useCopyToClipboard } from "@dub/ui";
import { Copy } from "@dub/ui/icons";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Highlighter } from "shiki";
import { toast } from "sonner";
import { X } from "../shared/icons";

interface PostbackEventDetailsSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: PostbackEventProps | null;
}

function PostbackEventDetailsSheetContent({
  event,
  setIsOpen,
}: Omit<PostbackEventDetailsSheetProps, "isOpen">) {
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
    if (highlighter && event) {
      let responseBodyDecoded = event.response_body;
      try {
        responseBodyDecoded = JSON.parse(event.response_body);
      } catch {
        // If it's not JSON, just use the original response body
      }
      const responseBodyHtml = highlighter.codeToHtml(
        JSON.stringify(responseBodyDecoded, null, 2),
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

  if (!event) return null;

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">{event.event}</Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="group flex items-center gap-2 p-6">
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
        <div className="grid gap-4 border-t border-neutral-200 bg-white p-6">
          <h4 className="font-semibold">Response</h4>
          <div className="flex items-center gap-8">
            <p className="text-sm text-neutral-500">HTTP status code</p>
            <p className="text-sm text-neutral-700">{event.response_status}</p>
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

export function PostbackEventDetailsSheet({
  isOpen,
  ...rest
}: PostbackEventDetailsSheetProps) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      contentProps={{ className: "md:w-[650px]" }}
    >
      <PostbackEventDetailsSheetContent {...rest} />
    </Sheet>
  );
}

export function usePostbackEventDetailsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [event, setEvent] = useState<PostbackEventProps | null>(null);

  const openWithEvent = (e: PostbackEventProps) => {
    setEvent(e);
    setIsOpen(true);
  };

  return {
    postbackEventDetailsSheet: event ? (
      <PostbackEventDetailsSheet
        event={event}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    openWithEvent,
  };
}
