"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { campaignEventSchema } from "@/lib/zod/schemas/campaigns";
import { Table, ToggleGroup, useTable } from "@dub/ui";
import { buildUrl, fetcher } from "@dub/utils";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { z } from "zod";
import { campaignEventsColumns } from "./campaign-events-columns";
import { CampaignEventsModal } from "./campaign-events-modal";

export type EventStatus = "delivered" | "opened" | "bounced";

export type CampaignEvent = z.infer<typeof campaignEventSchema>;

const MAX_EVENTS = 10;

export function CampaignEvents() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const { campaignId } = useParams<{ campaignId: string }>();
  const [status, setStatus] = useState<EventStatus>("delivered");
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const {
    data: events,
    error,
    isLoading,
  } = useSWR<CampaignEvent[]>(
    campaignId && workspaceId
      ? buildUrl(`/api/campaigns/${campaignId}/events`, {
          workspaceId,
          status,
          pageSize: MAX_EVENTS,
        })
      : null,
    fetcher,
  );

  const { table, ...tableProps } = useTable({
    data: events || [],
    columns: campaignEventsColumns,
    onRowClick: (row, e) => {
      const url = `/${workspaceSlug}/program/partners/${row.original.partner.id}`;

      if (e.metaKey || e.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => {
      const url = `/${workspaceSlug}/program/partners/${row.original.partner.id}`;
      window.open(url, "_blank");
    },
    rowProps: () => ({
      className:
        "cursor-pointer transition-colors hover:bg-neutral-50 border-b border-neutral-200 last:border-b-0",
    }),
    thClassName: "hidden",
    tdClassName: "border-l-0",
    resourceName: () => "event",
    emptyState: "No data yet",
    loading: isLoading,
    error: error ? "Failed to load events" : undefined,
  });

  return (
    <>
      <CampaignEventsModal
        showModal={showModal}
        setShowModal={setShowModal}
        status={status}
      />

      <div className="flex w-full items-center">
        <ToggleGroup
          className="flex w-full items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
          optionClassName="h-8 flex items-center justify-center rounded-lg flex-1 text-sm font-medium"
          indicatorClassName="bg-white shadow-sm"
          options={[
            { value: "delivered", label: "Delivered" },
            { value: "opened", label: "Opened" },
            { value: "bounced", label: "Bounced" },
          ]}
          selected={status}
          selectAction={(value: EventStatus) => setStatus(value)}
        />
      </div>

      <div className="group relative z-0 max-h-[530px] min-h-32 grow overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-hidden">
          <Table
            {...tableProps}
            table={table}
            className="[&_thead]:hidden"
            containerClassName="border-0 rounded-lg"
          />
        </div>

        {events && events.length >= MAX_EVENTS && (
          <div className="absolute bottom-0 left-0 z-10 flex w-full items-end">
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-white" />
            <button
              onClick={() => setShowModal(true)}
              className="group/button relative flex w-full items-center justify-center py-4"
            >
              <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-sm text-neutral-950 group-hover/button:bg-neutral-100 group-active/button:border-neutral-300">
                View all
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
