"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookEventProps } from "@/lib/types";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { WebhookEventListSkeleton } from "@/ui/webhooks/loading-events-skelton";
import { NoEventsPlaceholder } from "@/ui/webhooks/no-events-placeholder";
import { useWebhookEventDetailsSheet } from "@/ui/webhooks/webhook-event-details-sheet";
import { WebhookEventList } from "@/ui/webhooks/webhook-event-list";
import { fetcher } from "@dub/utils";
import { redirect } from "next/navigation";
import useSWR from "swr";

export default function WebhookLogsPageClient({
  webhookId,
}: {
  webhookId: string;
}) {
  const { slug, role, id: workspaceId } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.read",
    role,
  });

  if (permissionsError) {
    redirect(`/${slug}/settings`);
  }

  const { data: events, isLoading } = useSWR<WebhookEventProps[]>(
    !permissionsError &&
      `/api/webhooks/${webhookId}/events?workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { webhookEventDetailsSheet, openWithEvent } =
    useWebhookEventDetailsSheet();

  return (
    <PageWidthWrapper className="grid max-w-screen-lg gap-8 pb-10">
      {webhookEventDetailsSheet}
      {isLoading ? (
        <WebhookEventListSkeleton />
      ) : events && events.length === 0 ? (
        <NoEventsPlaceholder />
      ) : (
        <WebhookEventList events={events || []} onEventClick={openWithEvent} />
      )}
    </PageWidthWrapper>
  );
}
