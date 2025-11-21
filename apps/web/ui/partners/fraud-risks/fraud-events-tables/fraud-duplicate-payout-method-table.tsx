"use client";

import { useFraudEventInstances } from "@/lib/swr/use-fraud-event-instances";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEventProps, PartnerProps } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { Button, Table, TimestampTooltip, useTable } from "@dub/ui";
import { formatDateTimeSmart } from "@dub/utils";
import Link from "next/link";

interface EventDataProps {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  createdAt: string;
}

export function FraudDuplicatePayoutMethodTable({
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
        id: "partner",
        header: "Partner",
        minSize: 180,
        size: 220,
        cell: ({ row }) =>
          row.original.partner ? (
            <PartnerRowItem
              partner={row.original.partner}
              showFraudFlag={false}
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
        header: "",
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
    loading: isLoading,
    error: undefined,
  });

  if (!fraudEvents || fraudEvents.length === 0) {
    return null;
  }

  return <Table {...table} />;
}
