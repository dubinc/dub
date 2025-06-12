"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookEventProps } from "@/lib/types";
import { WebhookEventListSkeleton } from "@/ui/webhooks/loading-events-skelton";
import { NoEventsPlaceholder } from "@/ui/webhooks/no-events-placeholder";
import { WebhookEventList } from "@/ui/webhooks/webhook-events";
import { MaxWidthWrapper } from "@dub/ui";
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

  return (
    <MaxWidthWrapper className="max-w-screen-lg space-y-6">
      {isLoading ? (
        <WebhookEventListSkeleton />
      ) : events && events.length === 0 ? (
        <NoEventsPlaceholder />
      ) : (
        <WebhookEventList events={events || []} />
      )}
    </MaxWidthWrapper>
  );
}
