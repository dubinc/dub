"use client";

import { useFraudEventInstances } from "@/lib/swr/use-fraud-event-instances";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps, FraudEventProps } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { Button, Table, TimestampTooltip, useTable } from "@dub/ui";
import { formatDateTimeSmart } from "@dub/utils";
import Link from "next/link";

interface EventDataProps {
  customer: Pick<CustomerProps, "id" | "name" | "email"> | null;
  metadata: {
    source?: string;
    type?: "click" | "lead" | "sale" | "custom";
  } | null;
  createdAt: string;
}

export function FraudReferralSourceBannedTable({
  fraudEvent,
}: {
  fraudEvent: FraudEventProps;
}) {
  const { partner } = fraudEvent;

  const { slug: workspaceSlug } = useWorkspace();

  const { fraudEvents, loading: isLoading } =
    useFraudEventInstances<EventDataProps>({
      partnerId: partner.id,
      type: fraudEvent.type,
    });

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
        id: "type",
        header: "Type",
        minSize: 120,
        size: 150,
        cell: ({ row }) => {
          return row.original.metadata?.type ? (
            <CommissionTypeBadge type={row.original.metadata.type} />
          ) : (
            "-"
          );
        },
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
    loading: isLoading,
    error: undefined,
  });

  if (!fraudEvents || fraudEvents.length === 0) {
    return null;
  }

  return <Table {...table} />;
}
