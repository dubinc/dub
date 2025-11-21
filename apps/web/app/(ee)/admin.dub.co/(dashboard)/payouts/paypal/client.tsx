"use client";

import type { PaypalPayoutResponse } from "@/lib/paypal/get-pending-payouts";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { Button, StatusBadge, Table, usePagination, useTable } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  fetcher,
  nFormatter,
  OG_AVATAR_URL,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";

export default function PaypalPayoutsPageClient() {
  const { data: payouts = [], isLoading } = useSWR<PaypalPayoutResponse[]>(
    "/api/admin/payouts/paypal",
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { pagination, setPagination } = usePagination(100);

  // Client-side pagination
  const paginatedPayouts = useMemo(() => {
    const start = (pagination.pageIndex - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return payouts.slice(start, end);
  }, [payouts, pagination.pageIndex, pagination.pageSize]);

  const { table, ...tableProps } = useTable({
    data: paginatedPayouts,
    columns: [
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <img
              src={
                row.original.partner.image ||
                `${OG_AVATAR_URL}${row.original.partner.email || ""}`
              }
              alt={row.original.partner.email || ""}
              width={20}
              height={20}
              className="size-4 rounded-full"
            />
            <span className="text-sm text-neutral-900">
              {row.original.partner.email || "-"}
            </span>
          </div>
        ),
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "partner.country",
        cell: ({ row }) => {
          const country = row.original.partner.country;
          if (!country || country === "Unknown") {
            return (
              <div className="flex items-center gap-3">
                <Globe className="size-4 shrink-0" />
                <span className="text-sm text-neutral-900">Unknown</span>
              </div>
            );
          }
          return (
            <div
              className="flex items-center gap-3"
              title={COUNTRIES[country] ?? country}
            >
              <img
                alt={country}
                src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                className="size-4 shrink-0"
              />
              <span className="truncate text-sm text-neutral-900">
                {COUNTRIES[country] ?? country}
              </span>
            </div>
          );
        },
      },
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <img
              src={
                row.original.program.logo ||
                `${OG_AVATAR_URL}${row.original.program.name}`
              }
              alt={row.original.program.name}
              width={20}
              height={20}
              className="size-4 rounded-full"
            />
            <span className="text-sm font-medium">
              {row.original.program.name}
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = PayoutStatusBadges[row.original.status];

          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => currencyFormatter(row.original.amount),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `payout${plural ? "s" : ""}`,
    rowCount: payouts.length,
    loading: isLoading,
  });

  const stats = useMemo(() => {
    const allPayouts = payouts;
    const processingPayouts = payouts.filter((p) => p.status === "processing");
    const pendingPayouts = payouts.filter((p) => p.status === "pending");

    return [
      {
        id: "all",
        label: "Total payouts",
        amount: allPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: allPayouts.length,
        colorClassName: "bg-blue-500",
      },
      {
        id: "processing",
        label: "Processing payouts",
        amount: processingPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: processingPayouts.length,
        colorClassName: "bg-purple-500",
      },
      {
        id: "pending",
        label: "Pending payouts",
        amount: pendingPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: pendingPayouts.length,
        colorClassName: "bg-orange-500",
      },
    ];
  }, [payouts]);

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-6">
      <div className="flex items-center justify-start">
        <Link href="/payouts">
          <Button
            variant="secondary"
            text="Back to all payouts"
            icon={<ChevronLeft className="size-4" />}
          />
        </Link>
      </div>
      <div className="grid grid-cols-1 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white sm:grid-cols-3 sm:flex-row sm:divide-x sm:divide-y-0">
        {stats.map(({ id, label, amount, count, colorClassName }) => (
          <div key={id} className="flex-none px-4 py-3 sm:px-8 sm:py-6">
            <div className="flex items-center gap-2.5 text-sm text-neutral-600">
              <div
                className={cn(
                  "h-2 w-2 rounded-sm shadow-[inset_0_0_0_1px_#00000019]",
                  colorClassName,
                )}
              />
              <span>{label}</span>
            </div>
            <div className="mt-1 flex h-12 items-center">
              {!isLoading ? (
                <div className="flex items-baseline gap-2">
                  <NumberFlow
                    value={amount / 100}
                    className="text-xl font-medium sm:text-3xl"
                    format={{
                      style: "currency",
                      currency: "USD",
                    }}
                  />
                  <span className="text-sm text-neutral-500">
                    ({nFormatter(count, { full: true })})
                  </span>
                </div>
              ) : (
                <div className="h-10 w-24 animate-pulse rounded-md bg-neutral-200" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="w-full">
        <Table {...tableProps} table={table} />
      </div>
    </div>
  );
}
