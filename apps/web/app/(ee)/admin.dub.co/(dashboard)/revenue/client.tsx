"use client";

import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  CrownSmall,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { useMemo } from "react";
import useSWR from "swr";

export default function RevenuePageClient() {
  const { getQueryString } = useRouterStuff();

  const { data: { programs } = {}, isLoading } = useSWR<{
    programs: {
      id: string;
      name: string;
      logo: string;
      partners: number;
      sales: number;
      saleAmount: number;
    }[];
  }>(`/api/admin/revenue${getQueryString()}`, fetcher, {
    keepPreviousData: true,
  });

  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: programs ?? [],
    columns: [
      {
        id: "position",
        header: "Position",
        size: 12,
        minSize: 12,
        maxSize: 12,
        cell: ({ row }) => {
          return (
            <div className="flex w-28 items-center justify-start gap-2 tabular-nums">
              {row.index + 1}
              {row.index <= 2 && (
                <CrownSmall
                  className={cn("size-4", {
                    "text-amber-400": row.index === 0,
                    "text-neutral-400": row.index === 1,
                    "text-yellow-900": row.index === 2,
                  })}
                />
              )}
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
              src={row.original.logo}
              alt={row.original.name}
              width={20}
              height={20}
              className="size-4 rounded-full"
            />
            <span className="text-sm font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "partners",
        header: "Active Partners",
        accessorKey: "partners",
        cell: ({ row }) => nFormatter(row.original.partners, { full: true }),
      },
      {
        id: "sales",
        header: "Total Sales",
        accessorKey: "sales",
        cell: ({ row }) => nFormatter(row.original.sales, { full: true }),
      },
      {
        id: "revenue",
        header: "Affiliate Revenue",
        accessorKey: "revenue",
        cell: ({ row }) =>
          currencyFormatter(row.original.saleAmount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `program${plural ? "s" : ""}`,
    rowCount: programs?.length ?? 0,
    loading: isLoading,
  });

  const stats = useMemo(
    () => [
      {
        id: "partners",
        label: "Active Partners",
        value: programs?.reduce(
          (acc, { partners }) => acc + (partners || 0),
          0,
        ),
        colorClassName: "bg-blue-500",
      },
      {
        id: "sales",
        label: "Total Sales",
        value: programs?.reduce((acc, { sales }) => acc + (sales || 0), 0),
        colorClassName: "bg-green-500",
      },
      {
        id: "revenue",
        label: "Affiliate Revenue",
        value: programs?.reduce(
          (acc, { saleAmount }) => acc + (saleAmount || 0),
          0,
        ),
        colorClassName: "bg-purple-500",
      },
    ],
    [programs],
  );

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col space-y-6 p-6">
      <SimpleDateRangePicker defaultInterval="mtd" className="w-fit" />
      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        <div className="grid w-full grid-cols-1 divide-x sm:grid-cols-3">
          {stats.map(({ id, label, value, colorClassName }) => (
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
                {value !== undefined ? (
                  id === "revenue" ? (
                    <NumberFlow
                      value={value / 100}
                      className="text-xl font-medium sm:text-3xl"
                      format={{
                        style: "currency",
                        currency: "USD",
                        // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                        trailingZeroDisplay: "stripIfInteger",
                      }}
                    />
                  ) : (
                    <NumberFlow
                      value={value}
                      className="text-xl font-medium sm:text-3xl"
                    />
                  )
                ) : (
                  <div className="h-10 w-24 animate-pulse rounded-md bg-neutral-200" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full">
        <Table {...tableProps} table={table} />
      </div>
    </div>
  );
}
