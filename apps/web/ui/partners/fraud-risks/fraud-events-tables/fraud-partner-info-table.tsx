"use client";

import { useRawFraudEvents } from "@/lib/swr/use-raw-fraud-events";
import useWorkspace from "@/lib/swr/use-workspace";
import { rawFraudEventSchemas } from "@/lib/zod/schemas/fraud";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { Button, Table, TimestampTooltip, useTable } from "@dub/ui";
import { formatDateTimeSmart } from "@dub/utils";
import Link from "next/link";
import { z } from "zod";

// Both partnerFraudReport and partnerDuplicatePayoutMethod have the same schema
// We can use either one since they're identical
type EventDataProps = z.infer<
  (typeof rawFraudEventSchemas)["partnerFraudReport"]
>;

export function FraudPartnerInfoTable() {
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
        id: "partner",
        header: "Partner",
        minSize: 180,
        size: 220,
        cell: ({ row }) =>
          row.original.partner ? (
            <PartnerRowItem
              partner={row.original.partner}
              showFraudIndicator={false}
            />
          ) : (
            "-"
          ),
      },
      {
        id: "email",
        header: "Email",
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          return (
            <span className="text-sm text-neutral-600">
              {row.original.partner?.email || "-"}
            </span>
          );
        },
      },
      {
        id: "view",
        enableHiding: false,
        minSize: 80,
        size: 80,
        maxSize: 80,
        cell: ({ row }) => {
          if (!row.original.partner) return null;

          return (
            <Link
              href={`/${workspaceSlug}/program/partners/${row.original.partner.id}`}
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
