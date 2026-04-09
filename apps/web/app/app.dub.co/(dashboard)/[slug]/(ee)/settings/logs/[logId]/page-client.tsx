"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ApiLog, getStatusCodeBadgeVariant } from "@/ui/logs/log-utils";
import { CopyButton, StatusBadge, TimestampTooltip } from "@dub/ui";
import { ChevronRight, StackY3 } from "@dub/ui/icons";
import { fetcher, formatDateTime } from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HighlighterCore } from "shiki";
import useSWR from "swr";

export function LogDetailPageClient({ logId }: { logId: string }) {
  const { id: workspaceId, slug } = useWorkspace();

  const {
    data: log,
    isLoading,
    error,
  } = useSWR<ApiLog>(
    workspaceId && `/api/api-logs/${logId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  return (
    <PageContent
      title={
        isLoading ? (
          <div className="h-7 w-48 animate-pulse rounded-md bg-neutral-200" />
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href={`/${slug}/settings/logs`}
              aria-label="Back to logs"
              title="Back to logs"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <StackY3 className="size-4" />
            </Link>
            <div className="flex items-center gap-1.5">
              <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
              <span className="text-content-emphasis text-lg font-semibold leading-7">
                {log?.method} {log?.path}
              </span>
            </div>
          </div>
        )
      }
    >
      <PageWidthWrapper className="pb-10">
        {log ? (
          <LogDetailContent log={log} />
        ) : isLoading ? (
          <LogDetailSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Failed to load log
            </p>
            <p className="text-sm text-neutral-500">{error.message}</p>
          </div>
        ) : null}
      </PageWidthWrapper>
    </PageContent>
  );
}

function LogDetailContent({ log }: { log: ApiLog }) {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);
  const [highlightedRequest, setHighlightedRequest] = useState("");
  const [highlightedResponse, setHighlightedResponse] = useState("");

  useEffect(() => {
    import("shiki").then(({ createHighlighter }) => {
      createHighlighter({
        themes: ["min-light"],
        langs: ["json"],
      }).then(setHighlighter);
    });
  }, []);

  useEffect(() => {
    if (!highlighter) return;

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

    setHighlightedRequest(toHighlightedJson(log.request_body));
    setHighlightedResponse(toHighlightedJson(log.response_body));
  }, [highlighter, log]);

  const detailRows: Record<string, React.ReactNode> = {
    Endpoint: <span className="font-mono">{log.path}</span>,
    Date: (
      <TimestampTooltip
        timestamp={log.timestamp}
        rows={["local"]}
        side="top"
        delayDuration={150}
      >
        <span>{formatDateTime(log.timestamp)}</span>
      </TimestampTooltip>
    ),
    Status: (
      <StatusBadge
        variant={getStatusCodeBadgeVariant(log.status_code)}
        icon={null}
      >
        {log.status_code}
      </StatusBadge>
    ),
    Method: (
      <StatusBadge variant="new" icon={null}>
        {log.method}
      </StatusBadge>
    ),
    Duration: `${log.duration}ms`,
    ...(log.user_agent && {
      "User-agent": log.user_agent,
    }),
    ...(log.token_id && {
      "API Key": <span className="font-mono">{log.token_id}</span>,
    }),
    ID: (
      <div className="flex items-center gap-1.5">
        <span className="font-mono">{log.id}</span>
        <CopyButton value={log.id} variant="neutral" className="p-0" />
      </div>
    ),
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: Request & Response bodies */}
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-content-emphasis text-lg font-semibold">
              Request body
            </h3>
            {highlightedRequest ? (
              <div
                className="shiki-wrapper max-h-[500px] overflow-auto rounded-xl border border-neutral-200 bg-white p-4 text-sm "
                dangerouslySetInnerHTML={{ __html: highlightedRequest }}
              />
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 font-mono text-xs text-neutral-500">
                No request body
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-content-emphasis text-lg font-semibold">
              Response body
            </h3>
            {highlightedResponse ? (
              <div
                className="shiki-wrapper max-h-[500px] overflow-auto rounded-xl border border-neutral-200 bg-white p-4 text-sm "
                dangerouslySetInnerHTML={{ __html: highlightedResponse }}
              />
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 font-mono text-xs text-neutral-500">
                No response body
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Log details sidebar */}
      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-content-emphasis mb-2 text-base font-semibold">
            Log details
          </h3>
          <div className="flex flex-col gap-1">
            {Object.entries(detailRows).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-1.5 rounded-md py-1"
              >
                <div className="w-24 shrink-0 text-xs font-medium text-neutral-700">
                  {key}
                </div>
                <div className="flex min-w-0 flex-1 items-center text-xs font-medium text-neutral-500">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <div className="flex flex-col gap-6">
          <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
          <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
        </div>
      </div>
      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="h-64 animate-pulse rounded-xl bg-neutral-200" />
      </div>
    </div>
  );
}
