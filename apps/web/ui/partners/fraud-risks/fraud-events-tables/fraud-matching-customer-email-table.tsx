"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps, FraudEventProps } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import {
  Button,
  Table,
  TimestampTooltip,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { fetcher, formatDateTimeSmart } from "@dub/utils";
import Link from "next/link";
import useSWR from "swr";

interface EventDataProps {
  customer: Pick<CustomerProps, "id" | "name" | "email">;
  createdAt: string;
}

export function FraudMatchingCustomerEmailTable({
  fraudEvent,
}: {
  fraudEvent: FraudEventProps;
}) {
  const { partner } = fraudEvent;

  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

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
        id: "email",
        header: "Email",
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          return (
            <span className="text-sm text-neutral-600">
              {row.original.customer?.email || "-"}
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
          if (!row.original.customer) return null;

          return (
            <Link
              href={`/${workspaceSlug}/customers/${row.original.customer.id}`}
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
