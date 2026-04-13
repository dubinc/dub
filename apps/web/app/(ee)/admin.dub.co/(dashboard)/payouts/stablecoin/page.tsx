"use client";

import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import {
  Button,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
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
import { Suspense, useMemo } from "react";
import useSWR from "swr";

interface StablecoinPayoutResponse {
  program: {
    id: string;
    name: string;
    logo: string | null;
  };
  partner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    country: string | null;
  };
  status: keyof typeof PayoutStatusBadges;
  amount: number;
}

export default function StablecoinPayoutsPage() {
  return (
    <Suspense>
      <StablecoinPayoutsPageClient />
    </Suspense>
  );
}

function StablecoinPayoutsPageClient() {
  const { getQueryString, queryParams, searchParamsObj } = useRouterStuff();
  const { status } = searchParamsObj;

  const { data: payouts = [], isLoading } = useSWR<StablecoinPayoutResponse[]>(
    `/api/admin/payouts/stablecoin${getQueryString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: allPayouts = [] } = useSWR<StablecoinPayoutResponse[]>(
    `/api/admin/payouts/stablecoin${getQueryString(undefined, {
      exclude: ["status"],
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const stats = useMemo(() => {
    const completedPayouts = allPayouts.filter((p) =>
      ["sent", "completed"].includes(p.status),
    );
    const processingPayouts = allPayouts.filter((p) =>
      ["processing", "processed"].includes(p.status),
    );
    const pendingPayouts = allPayouts.filter((p) => p.status === "pending");

    return [
      {
        id: "all",
        label: "Total payouts",
        amount: allPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: allPayouts.length,
        colorClassName: "bg-purple-500",
      },
      {
        id: "completed",
        label: "Completed payouts",
        amount: completedPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: completedPayouts.length,
        colorClassName: "bg-green-500",
      },
      {
        id: "processing",
        label: "Processing payouts",
        amount: processingPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: processingPayouts.length,
        colorClassName: "bg-blue-500",
      },
      {
        id: "pending",
        label: "Pending payouts",
        amount: pendingPayouts.reduce((acc, p) => acc + p.amount, 0),
        count: pendingPayouts.length,
        colorClassName: "bg-orange-500",
      },
    ];
  }, [allPayouts]);

  const { pagination, setPagination } = usePagination(100);

  const filteredPayouts = useMemo(() => {
    if (!status || status === "all") return payouts;
    if (!["pending", "processing", "completed"].includes(status))
      return payouts;
    return payouts.filter((p) => p.status === status);
  }, [payouts, status]);

  const paginatedPayouts = useMemo(() => {
    const start = (pagination.pageIndex - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredPayouts.slice(start, end);
  }, [filteredPayouts, pagination.pageIndex, pagination.pageSize]);

  const { table, ...tableProps } = useTable({
    data: paginatedPayouts,
    columns: [
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <PartnerAvatar partner={row.original.partner} className="size-4" />
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
        meta: {
          filterParams: ({ getValue }) => ({ country: getValue() }),
        },
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
        accessorKey: "program.id",
        meta: {
          filterParams: ({ getValue }) => ({ programId: getValue() }),
        },
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
        meta: {
          filterParams: ({ row }) => ({ status: row.original.status }),
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
    rowCount: filteredPayouts.length,
    loading: isLoading,
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as
        | {
            filterParams?: any;
          }
        | undefined;

      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
    },
  });

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
      <div className="grid grid-cols-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white sm:grid-cols-4 sm:flex-row sm:divide-x sm:divide-y-0">
        {stats.map(({ id, label, amount, count, colorClassName }) => {
          const isActive = (status ?? "all") === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() =>
                queryParams({
                  ...(id === "all"
                    ? { del: ["status", "page"] }
                    : { set: { status: id }, del: "page" }),
                })
              }
              className={cn(
                "flex-none px-4 py-3 text-left transition-colors hover:bg-neutral-50 sm:px-8 sm:py-6",
                isActive && "bg-neutral-50",
              )}
            >
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
                      className="text-xl font-medium sm:text-2xl"
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
            </button>
          );
        })}
      </div>
      <div className="w-full">
        <Table {...tableProps} table={table} />
      </div>
    </div>
  );
}
