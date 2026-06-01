"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookEventProps } from "@/lib/types";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { WebhookEventListSkeleton } from "@/ui/webhooks/loading-events-skelton";
import { NoEventsPlaceholder } from "@/ui/webhooks/no-events-placeholder";
import { WebhookEventDetailsSheet } from "@/ui/webhooks/webhook-event-details-sheet";
import { WebhookEventList } from "@/ui/webhooks/webhook-event-list";
import { fetcher } from "@dub/utils";
import { redirect } from "next/navigation";
import { useMemo, useState } from "react";
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

  const [detailsSheetState, setDetailsSheetState] = useState<
    { open: false; eventId: string | null } | { open: true; eventId: string }
  >({ open: false, eventId: null });

  const currentEvent = useMemo(
    () =>
      detailsSheetState.eventId
        ? events?.find(({ event_id }) => event_id === detailsSheetState.eventId)
        : null,
    [events, detailsSheetState.eventId],
  );

  const [previousEventId, nextEventId] = useMemo(() => {
    if (!events || !detailsSheetState.eventId) return [null, null];

    const currentIndex = events.findIndex(
      ({ event_id }) => event_id === detailsSheetState.eventId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? events[currentIndex - 1].event_id : null,
      currentIndex < events.length - 1
        ? events[currentIndex + 1].event_id
        : null,
    ];
  }, [events, detailsSheetState.eventId]);

  return (
    <PageWidthWrapper className="grid max-w-screen-lg gap-8 pb-10">
      {detailsSheetState.eventId && currentEvent && (
        <WebhookEventDetailsSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((state) => ({ ...state, open }) as any)
          }
          event={currentEvent}
          onPrevious={
            previousEventId
              ? () =>
                  setDetailsSheetState({
                    open: true,
                    eventId: previousEventId,
                  })
              : undefined
          }
          onNext={
            nextEventId
              ? () =>
                  setDetailsSheetState({
                    open: true,
                    eventId: nextEventId,
                  })
              : undefined
          }
        />
      )}
      {isLoading ? (
        <WebhookEventListSkeleton />
      ) : events && events.length === 0 ? (
        <NoEventsPlaceholder />
      ) : (
        <WebhookEventList
          events={events || []}
          selectedEventId={detailsSheetState.eventId}
          onEventClick={(event) =>
            setDetailsSheetState({ open: true, eventId: event.event_id })
          }
        />
      )}
    </PageWidthWrapper>
  );
}
