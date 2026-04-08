"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ApiLog, getStatusCodeBadgeVariant } from "@/ui/logs/log-utils";
import { StatusBadge } from "@dub/ui";
import { Note } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

function formatJson(str: string): string {
  if (!str) return "";
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function LogDetailPageClient({ logId }: { logId: string }) {
  const { id: workspaceId, slug } = useWorkspace();

  const { data: log, isLoading } = useSWR<ApiLog>(
    workspaceId && `/api/api-logs/${logId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  return (
    <PageContent
      title={
        log ? (
          <div className="flex items-center gap-2">
            <Note className="size-4 text-neutral-500" />
            <span className="font-mono text-sm">{log.path}</span>
          </div>
        ) : (
          "API"
        )
      }
      titleBackHref={`/${slug}/settings/logs`}
    >
      <PageWidthWrapper>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-neutral-500">Loading...</div>
          </div>
        ) : !log ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-neutral-500">Log not found</div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-10">
            {/* Header metadata */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
              <StatusBadge variant="new" icon={null}>
                {log.method}
              </StatusBadge>
              <StatusBadge
                variant={getStatusCodeBadgeVariant(log.status_code)}
                icon={null}
              >
                {log.status_code}
              </StatusBadge>
              <span className="text-sm text-neutral-500">{log.duration}ms</span>
              <span className="text-sm text-neutral-400">·</span>
              <span className="text-sm text-neutral-500">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Details */}
            <div className="grid gap-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-neutral-500">Request ID</span>
                <span className="font-mono text-xs">{log.id}</span>
              </div>
              {log.token_id && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-neutral-500">API Key</span>
                  <span className="font-mono text-xs">{log.token_id}</span>
                </div>
              )}
              {log.user_id && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-neutral-500">User ID</span>
                  <span className="font-mono text-xs">{log.user_id}</span>
                </div>
              )}
              {log.user_agent && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-neutral-500">User Agent</span>
                  <span className="truncate text-xs text-neutral-600">
                    {log.user_agent}
                  </span>
                </div>
              )}
            </div>

            {/* Request & Response bodies */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-neutral-700">
                  Request Body
                </h3>
                <pre className="max-h-[500px] overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs text-neutral-700">
                  {formatJson(log.request_body) || "No request body"}
                </pre>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-neutral-700">
                  Response Body
                </h3>
                <pre className="max-h-[500px] overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs text-neutral-700">
                  {formatJson(log.response_body) || "No response body"}
                </pre>
              </div>
            </div>
          </div>
        )}
      </PageWidthWrapper>
    </PageContent>
  );
}
