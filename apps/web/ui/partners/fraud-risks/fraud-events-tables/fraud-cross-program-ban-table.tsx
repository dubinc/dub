"use client";

import { useRawFraudEvents } from "@/lib/swr/use-raw-fraud-events";
import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import { Table, TimestampTooltip, useTable } from "@dub/ui";
import { formatDateTimeSmart } from "@dub/utils";

interface EventDataProps {
  bannedAt: string;
  bannedReason: string | null;
}

export function FraudCrossProgramBanTable() {
  const { fraudEvents, loading: isLoading } =
    useRawFraudEvents<EventDataProps>();

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

  return <Table {...table} />;
}
