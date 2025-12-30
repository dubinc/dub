"use client";

import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { fraudEventSchemas } from "@/lib/zod/schemas/fraud";
import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import { Table, TimestampTooltip, useTable } from "@dub/ui";
import { formatDateTimeSmart } from "@dub/utils";
import { z } from "zod";

type EventDataProps = z.infer<
  (typeof fraudEventSchemas)["partnerCrossProgramBan"]
>;

export function FraudCrossProgramBanTable() {
  const { fraudEvents, loading, error } = useFraudEvents<EventDataProps>();

  const table = useTable({
    data: fraudEvents || [],
    columns: [
      {
        id: "date",
        header: "Date",
        minSize: 140,
        size: 160,
        cell: ({ row: { original } }) => (
          <TimestampTooltip
            timestamp={original.metadata.bannedAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <p>{formatDateTimeSmart(original.metadata.bannedAt || "")}</p>
          </TimestampTooltip>
        ),
      },
      {
        id: "banReason",
        header: "Ban reason",
        minSize: 180,
        size: 220,
        cell: ({ row: { original } }) => {
          return original.metadata.bannedReason ? (
            <span className="text-sm text-neutral-600">
              {BAN_PARTNER_REASONS[original.metadata.bannedReason]}
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
    loading,
    error,
  });

  return <Table {...table} />;
}
