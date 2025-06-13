import { AnalyticsResponse } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { LoadingSpinner, Table, usePagination, useTable } from "@dub/ui";
import { currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import { useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { ProgramAnalyticsContext } from "./page-client";

export function AnalyticsPartnersTable() {
  const { queryString } = useContext(ProgramAnalyticsContext);

  const [pageSize, setPageSize] = useState(10);
  const { pagination, setPagination } = usePagination(pageSize);

  const {
    data: topPartners,
    error: topPartnersError,
    isLoading: topPartnersLoading,
  } = useSWR<AnalyticsResponse["top_partners"][]>(
    `/api/analytics?${editQueryString(queryString ?? "", {
      event: "composite",
      groupBy: "top_partners",
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
    // cellRight: (cell) => {
    //   const meta = cell.column.columnDef.meta as
    //     | {
    //         filterParams?: any;
    //       }
    //     | undefined;

    //   return (
    //     meta?.filterParams && (
    //       <FilterButtonTableRow set={meta.filterParams(cell)} />
    //     )
    //   );
    // },
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: topPartners?.length ?? 0,
    loading: topPartnersLoading,
    error: topPartnersError ? "Failed to load partners" : undefined,
  });

  return topPartnersPage && topPartnersPage.length > 0 ? (
    <Table
      {...tableProps}
      table={table}
      containerClassName="border-none"
      scrollWrapperClassName="min-h-[200px]"
    />
  ) : (
    <div className="text-content-muted flex h-36 items-center justify-center text-sm">
      {topPartnersLoading ? (
        <LoadingSpinner />
      ) : topPartnersError ? (
        "Failed to load partners."
      ) : (
        "No partners found."
      )}
    </div>
  );
}

// Don't seem to need this locally but the Vercel build fails without a type predicate
const isNotNull = <T extends unknown>(item: T | null): item is T =>
  item !== null;
