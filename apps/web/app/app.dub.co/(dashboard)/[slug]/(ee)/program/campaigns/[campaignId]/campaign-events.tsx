"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { campaignEventSchema } from "@/lib/zod/schemas/campaigns";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Table, ToggleGroup, Tooltip, useTable } from "@dub/ui";
import {
  buildUrl,
  fetcher,
  formatDateTime,
  OG_AVATAR_URL,
  timeAgo,
} from "@dub/utils";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { z } from "zod";

type EventStatus = "delivered" | "opened" | "bounced";

export type CampaignEvent = z.infer<typeof campaignEventSchema>;

export function CampaignEvents() {
  const router = useRouter();
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
          pageSize: 10,
        })
      : null,
    fetcher,
  );

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "",
        enableHiding: false,
        cell: ({ row }: { row: { original: CampaignEvent } }) => (
          <div className="flex gap-2">
            <div className="flex h-8 shrink-0 items-center justify-center">
              <img
                src={
                  row.original.partner.image ||
                  `${OG_AVATAR_URL}${row.original.partner.name}`
                }
                alt={row.original.partner.name}
                className="size-7 rounded-full object-cover"
              />
            </div>
            <div className="flex h-8 min-w-0 flex-1 flex-col">
              <div className="text-content-emphasis truncate text-xs font-semibold">
                {row.original.partner.name}
              </div>
              <div className="flex items-center gap-1">
                <GroupColorCircle group={row.original.group} />
                <span className="text-content-subtle truncate text-xs font-medium">
                  {row.original.group?.name}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "timestamp",
        header: "",
        enableHiding: false,
        minSize: 60,
        cell: ({ row }: { row: { original: CampaignEvent } }) => {
          const timestamp = getTimestamp(row.original);

          return (
            <Tooltip
              content={timestamp ? formatDateTime(timestamp) : "-"}
              side="top"
            >
              <div
                className="text-content-subtle flex h-8 shrink-0 items-center justify-end text-xs font-medium"
                onClick={(e) => e.preventDefault()}
              >
                {timeAgo(timestamp)}
              </div>
            </Tooltip>
          );
        },
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: events || [],
    columns,
    onRowClick: (row, e) => {
      const url = getPartnerUrl({
        workspaceSlug: workspaceSlug!,
        id: row.original.partner.id,
      });

      if (e.metaKey || e.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) =>
      window.open(
        getPartnerUrl({
          workspaceSlug: workspaceSlug!,
          id: row.original.partner.id,
        }),
        "_blank",
      ),
    rowProps: () => ({
      className:
        "cursor-pointer transition-colors hover:bg-neutral-50 border-b border-neutral-200 last:border-b-0",
    }),
    thClassName: "hidden",
    tdClassName: "border-l-0",
    resourceName: () => "event",
    loading: isLoading,
    error: error ? "Failed to load events" : undefined,
    emptyState: (
      <div className="flex h-20 items-center justify-center text-sm text-neutral-500">
        No {status} events found
      </div>
    ),
  });

  return (
    <>
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

      <div className="min-h-80 rounded-lg border border-neutral-200 bg-white">
        <Table
          {...tableProps}
          table={table}
          className="[&_thead]:hidden"
          containerClassName="border-0 rounded-lg"
        />
      </div>
    </>
  );
}

const getPartnerUrl = ({
  workspaceSlug,
  id,
}: {
  workspaceSlug: string;
  id: string;
}) => `/${workspaceSlug}/program/partners/${id}`;

const getTimestamp = (event: CampaignEvent) => {
  if (event.deliveredAt) {
    return event.deliveredAt;
  }

  if (event.openedAt) {
    return event.openedAt;
  }

  if (event.bouncedAt) {
    return event.bouncedAt;
  }

  return null;
};
