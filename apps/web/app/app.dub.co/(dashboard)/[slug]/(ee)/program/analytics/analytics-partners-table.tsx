import { AnalyticsResponse } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import { Table, usePagination, useTable } from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  fetcher,
  nFormatter,
} from "@dub/utils";
import { useContext, useMemo } from "react";
import useSWR from "swr";

export function AnalyticsPartnersTable() {
  const { selectedTab, queryString } = useContext(AnalyticsContext);

  const { pagination, setPagination } = usePagination(10);

  const {
    data: topPartners,
    error: topPartnersError,
    isLoading: topPartnersLoading,
  } = useSWR<AnalyticsResponse["top_partners"][]>(
    `/api/analytics?${editQueryString(queryString, {
      event: selectedTab,
      groupBy: "top_partners",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const topPartnersList = useMemo(() => {
    return topPartners?.slice(
      (pagination.pageIndex - 1) * pagination.pageSize,
      pagination.pageIndex * pagination.pageSize,
    );
  }, [topPartners, pagination]);

  const { table, ...tableProps } = useTable({
    data: topPartnersList || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          const p = row.original.partner;
          return (
            <PartnerRowItem
              partner={{
                ...p,
                payoutsEnabledAt: p.payoutsEnabledAt
                  ? new Date(p.payoutsEnabledAt)
                  : null,
              }}
            />
          );
        },
        meta: {
          filterParams: ({ row }) => ({
            partnerId: row.original.partnerId,
          }),
        },
      },
      {
        id: "location",
        header: "Location",
        minSize: 150,
        cell: ({ row }) => {
          const country = row.original.partner.country;
          return (
            <div className="flex items-center gap-2">
              {country && (
                <img
                  alt={`${country} flag`}
                  src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              )}
              <span className="min-w-0 truncate">
                {(country ? COUNTRIES[country] : null) ?? "-"}
              </span>
            </div>
          );
        },
      },
      ...(selectedTab === "sales"
        ? [
            {
              id: "sales",
              header: "Sales",
              accessorFn: (d) => nFormatter(d.sales),
            },
            {
              id: "saleAmount",
              header: "Revenue",
              accessorFn: (d) =>
                currencyFormatter(d.saleAmount / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
            },
          ]
        : [
            {
              id: selectedTab,
              header: `${capitalize(selectedTab)}`,
              accessorFn: (d) => nFormatter(d[selectedTab]),
            },
          ]),
    ],
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
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["clicks", "leads", "saleAmount"],
    sortBy: selectedTab === "sales" ? "saleAmount" : selectedTab,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: topPartners?.length ?? 0,
    loading: topPartnersLoading,
    error: topPartnersError ? "Failed to load partners" : undefined,
  });

  return !topPartnersList ? (
    <PartnerTableSkeleton />
  ) : topPartnersList.length > 0 ? (
    <div
      className={cn("relative", topPartnersLoading && "pointer-events-none")}
    >
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-none"
        scrollWrapperClassName="min-h-[200px]"
      />
    </div>
  ) : (
    <div className="text-content-muted flex h-36 items-center justify-center text-sm">
      {topPartnersError ? "Failed to load partners." : "No partners found."}
    </div>
  );
}

function PartnerTableSkeleton() {
  const { selectedTab } = useContext(AnalyticsContext);
  return (
    <div className="bg-bg-default relative overflow-x-auto rounded-xl">
      <table className="group/table w-full border-separate border-spacing-0 text-sm transition-[border-spacing,margin-top] [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent [&_tr]:border-b">
        <thead>
          <tr>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Partner
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Location
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              {capitalize(selectedTab)}
            </th>
            {selectedTab === "sales" && (
              <>
                <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
                  Revenue
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {[...Array(10)].map((_, idx) => (
            <tr key={idx} className="group/row">
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="size-6 animate-pulse rounded-full bg-neutral-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                </div>
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
              </td>
              {selectedTab === "sales" && (
                <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
