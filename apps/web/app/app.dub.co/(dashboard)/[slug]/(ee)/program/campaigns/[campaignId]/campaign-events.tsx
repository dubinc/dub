"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { campaignEventSchema } from "@/lib/zod/schemas/campaigns";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { ToggleGroup } from "@dub/ui";
import { fetcher, OG_AVATAR_URL, timeAgo } from "@dub/utils";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { z } from "zod";

type EventStatus = "opened" | "bounced";
export type CampaignEvent = z.infer<typeof campaignEventSchema>;

export function CampaignEvents() {
  const { id: workspaceId } = useWorkspace();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [status, setStatus] = useState<EventStatus>("opened");

  const {
    data: events,
    error,
    isLoading,
  } = useSWR<CampaignEvent[]>(
    campaignId && workspaceId
      ? `/api/campaigns/${campaignId}/events?workspaceId=${workspaceId}&status=${status}&pageSize=10`
      : null,
    fetcher,
  );

  return (
    <>
      <div className="flex w-full items-center">
        <ToggleGroup
          className="flex w-full items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
          optionClassName="h-8 flex items-center justify-center rounded-lg flex-1 text-sm font-medium"
          indicatorClassName="bg-white shadow-sm"
          options={[
            { value: "opened", label: "Opened" },
            { value: "bounced", label: "Bounced" },
          ]}
          selected={status}
          selectAction={(value: EventStatus) => setStatus(value)}
        />
      </div>

      {error ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-content-subtle text-sm">Failed to load events</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {isLoading ? (
            <CampaignEventsLoadingSkeleton />
          ) : events && events.length > 0 ? (
            events.map((event) => (
              <CampaignEventRow key={event.id} event={event} />
            ))
          ) : (
            <div className="flex h-20 items-center justify-center text-sm text-neutral-500">
              No {status} events found
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CampaignEventRow({ event }: { event: CampaignEvent }) {
  const getTimestamp = () => {
    if (event.openedAt) return event.openedAt;
    if (event.bouncedAt) return event.bouncedAt;
    return event.createdAt;
  };

  return (
    <div className="flex cursor-pointer gap-2 p-2.5 transition-colors hover:bg-neutral-50">
      <div className="flex h-8 shrink-0 items-center justify-center">
        <img
          src={event.partner.image || `${OG_AVATAR_URL}${event.partner.name}`}
          alt={event.partner.name}
          className="size-7 rounded-full object-cover"
        />
      </div>

      <div className="flex h-8 min-w-0 flex-1 flex-col">
        <div className="text-content-emphasis truncate text-xs font-semibold">
          {event.partner.name}
        </div>
        <div className="flex items-center gap-1">
          <GroupColorCircle group={event.group} />
          <span className="text-content-subtle truncate text-xs font-medium">
            {event.group?.name}
          </span>
        </div>
      </div>

      <div className="text-content-subtle flex h-8 shrink-0 items-center justify-center text-xs font-medium">
        {timeAgo(getTimestamp())}
      </div>
    </div>
  );
}

function CampaignEventsLoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-4">
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              <div className="flex items-center gap-1.5">
                <div className="size-3 animate-pulse rounded-full bg-neutral-200" />
                <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          </div>

          <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-neutral-200" />
        </div>
      ))}
    </>
  );
}
