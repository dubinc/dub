"use client";

import { useRawFraudEvents } from "@/lib/swr/use-raw-fraud-events";
import useWorkspace from "@/lib/swr/use-workspace";
import { rawFraudEventSchemas } from "@/lib/zod/schemas/fraud";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { Button, Table, TimestampTooltip, useTable } from "@dub/ui";
import { formatDateTimeSmart } from "@dub/utils";
import Link from "next/link";
import { z } from "zod";

type EventDataProps = z.infer<
  (typeof rawFraudEventSchemas)["referralSourceBanned"]
>;

export function FraudReferralSourceBannedTable() {
  const { slug: workspaceSlug } = useWorkspace();

  const { fraudEvents, loading, error } = useRawFraudEvents<EventDataProps>();

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
            timestamp={row.original.createdAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <p>{formatDateTimeSmart(row.original.createdAt)}</p>
          </TimestampTooltip>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 180,
        size: 220,
        cell: ({ row }) =>
          row.original.customer ? (
            <CustomerRowItem customer={row.original.customer} />
          ) : (
            "-"
          ),
      },
      {
        id: "source",
        header: "Source",
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          return row.original.metadata?.source ? (
            <span className="text-sm text-neutral-600">
              {row.original.metadata?.source}
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        id: "view",
        header: "",
        enableHiding: false,
        minSize: 100,
        size: 100,
        maxSize: 100,
        cell: ({ row }) => {
          if (!row.original.customer) return null;

          return (
            <Link
              href={`/${workspaceSlug}/events?interval=all&customerId=${row.original.customer.id}`}
              target="_blank"
            >
              <Button
                variant="secondary"
                text="View"
                className="h-7 w-fit rounded-lg px-2.5 py-2"
              />
            </Link>
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
