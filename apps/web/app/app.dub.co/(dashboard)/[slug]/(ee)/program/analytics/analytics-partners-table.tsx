import { AnalyticsResponse } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { Table, usePagination, useTable } from "@dub/ui";
import { currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import { useContext, useMemo } from "react";
import useSWR from "swr";
import { ProgramAnalyticsContext } from "./page-client";

function PartnerTableSkeleton() {
  return (
    <div className="bg-bg-default relative overflow-x-auto rounded-xl">
      <table className="group/table w-full border-separate border-spacing-0 text-sm transition-[border-spacing,margin-top] [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent [&_tr]:border-b">
        <thead>
          <tr>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Partner
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Clicks
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Leads
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Sales
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Revenue
            </th>
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
                <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsPartnersTable() {
  const { event, queryString } = useContext(ProgramAnalyticsContext);

  const { pagination, setPagination } = usePagination(10);

  const {
    data: topPartners,
    error: topPartnersError,
    isLoading: topPartnersLoading,
  } = useSWR<AnalyticsResponse["top_partners"][]>(
    `/api/analytics?${editQueryString(queryString ?? "", {
      event: "composite",
      groupBy: "top_partners",
      sortBy: event,
    })}`,
    fetcher,
  );

  const topPartnersPage = useMemo(() => {
    return topPartners?.slice(
      (pagination.pageIndex - 1) * pagination.pageSize,
      pagination.pageIndex * pagination.pageSize,
    );
  }, [topPartners, pagination]);

  const { table, ...tableProps } = useTable({
    data: topPartnersPage || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={{
                ...row.original.partner,
                payoutsEnabledAt: new Date(
                  row.original.partner.payoutsEnabledAt,
                ),
              }}
            />
          );
        },
        meta: {
          filterParams: ({ row }) => ({
            partnerId: row.original.id,
          }),
        },
      },
      {
        id: "clicks",
        header: "Clicks",
        accessorFn: (d) => nFormatter(d.clicks),
      },
      {
        id: "leads",
        header: "Leads",
        accessorFn: (d) => nFormatter(d.leads),
      },
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
    ],
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: topPartners?.length ?? 0,
    loading: topPartnersLoading,
    error: topPartnersError ? "Failed to load partners" : undefined,
  });

  return topPartnersLoading ? (
    <PartnerTableSkeleton />
  ) : topPartnersPage && topPartnersPage.length > 0 ? (
    <Table
      {...tableProps}
      table={table}
      containerClassName="border-none"
      scrollWrapperClassName="min-h-[200px]"
    />
  ) : (
    <div className="text-content-muted flex h-36 items-center justify-center text-sm">
      {topPartnersError ? "Failed to load partners." : "No partners found."}
    </div>
  );
}
