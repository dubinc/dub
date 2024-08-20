"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import z from "@/lib/zod";
import { webhookEventSchemaTB } from "@/lib/zod/schemas/webhooks";
import WebhookHeader from "@/ui/webhooks/webhook-header";
import { MaxWidthWrapper } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { redirect } from "next/navigation";
import useSWR from "swr";

export default function WebhookLogsPageClient({
  webhookId,
}: {
  webhookId: string;
}) {
  const { slug, flags, role, id: workspaceId } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.read",
    role,
  });

  if (!flags?.webhooks || permissionsError) {
    redirect(`/${slug}/settings`);
  }

  const {
    data: events,
    isLoading,
    error,
  } = useSWR<z.infer<typeof webhookEventSchemaTB>[]>(
    `/api/webhooks/${webhookId}/events?workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  console.log(events);

  return (
    <>
      <WebhookHeader webhookId={webhookId} page="events" />
      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        {/* display events table */}
        <div>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Event Type</th>
                <th>HTTP Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {events?.map((event) => (
                <tr key={event.event_id}>
                  <td>{event.http_status}</td>
                  <td>{event.event}</td>
                  <td>{event.http_status}</td>
                  <td>{event.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MaxWidthWrapper>
    </>
  );
}
