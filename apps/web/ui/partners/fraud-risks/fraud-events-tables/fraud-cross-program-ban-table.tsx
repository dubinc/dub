"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEventProps } from "@/lib/types";
import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import { Table, TimestampTooltip, useRouterStuff, useTable } from "@dub/ui";
import { fetcher, formatDateTimeSmart } from "@dub/utils";
import useSWR from "swr";

interface EventDataProps {
  bannedAt: string;
  bannedReason: string | null;
}

export function FraudCrossProgramBanTable({
  fraudEvent,
}: {
  fraudEvent: FraudEventProps;
}) {
  const { partner } = fraudEvent;

  const { getQueryString } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const { data: fraudEvents, isLoading } = useSWR<EventDataProps[]>(
    workspaceId && partner.id && fraudEvent.type
      ? `/api/fraud-events/instances${getQueryString({
          workspaceId,
          partnerId: partner.id,
          type: fraudEvent.type,
        })}`
      : null,
    fetcher,
  );

  const table = useTable({
    data: fraudEvents || [],
    columns: [
      {
        id: "date",
        header: "Date",
        minSize: 140,
        size: 160,
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.bannedAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <p>{formatDateTimeSmart(row.original.bannedAt)}</p>
          </TimestampTooltip>
        ),
      },
      {
        id: "banReason",
        header: "Ban reason",
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          return row.original.bannedReason ? (
            <span className="text-sm text-neutral-600">
              {BAN_PARTNER_REASONS[row.original.bannedReason]}
            </span>
          ) : (
            "-"
          );
        },
      },
    ],
    resourceName: (p) => `event${p ? "s" : ""}`,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    loading: isLoading,
    error: undefined,
  });

  if (!fraudEvents || fraudEvents.length === 0) {
    return null;
  }

  return <Table {...table} />;
}
