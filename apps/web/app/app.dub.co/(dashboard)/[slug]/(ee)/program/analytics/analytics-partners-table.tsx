import { editQueryString } from "@/lib/analytics/utils";
import usePartners from "@/lib/swr/use-partners";
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
  } = useSWR<
    {
      partnerId: string;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
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

  const {
    partners,
    error: partnersError,
    loading: partnersLoading,
  } = usePartners({
    enabled: Boolean(topPartners?.length),
    query: {
      ids: topPartnersPage?.map((d) => d.partnerId),
    },
  });

  const error = topPartnersError || partnersError;
  const loading = topPartnersLoading || partnersLoading;

  let data = useMemo(() => {
    if (!topPartnersPage?.length || !partners?.length) return [];
    return topPartnersPage
      .map((d) => {
        const partner = partners.find((p) => p.id === d.partnerId);
        return partner
          ? {
              ...d,
              ...partner,
            }
          : null;
      })
      .filter((p) => p !== null);
  }, [topPartnersPage, partners]);

  const { table, ...tableProps } = useTable({
    data: data || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          return <PartnerRowItem partner={row.original} />;
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
        accessorFn: (d) =>
          d.status !== "pending" ? nFormatter(d.clicks) : "-",
      },
      {
        id: "leads",
        header: "Leads",
        accessorFn: (d) => (d.status !== "pending" ? nFormatter(d.leads) : "-"),
      },
      {
        id: "sales",
        header: "Sales",
        accessorFn: (d) => (d.status !== "pending" ? nFormatter(d.sales) : "-"),
      },
      {
        id: "saleAmount",
        header: "Revenue",
        accessorFn: (d) =>
          d.status !== "pending"
            ? currencyFormatter(d.saleAmount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
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
    loading,
    error: error ? "Failed to load partners" : undefined,
  });

  return data.length > 0 ? (
    <Table
      {...tableProps}
      table={table}
      containerClassName="border-none"
      scrollWrapperClassName="min-h-[200px]"
    />
  ) : (
    <div className="text-content-muted flex h-36 items-center justify-center text-sm">
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        "Failed to load partners."
      ) : (
        "No partners found."
      )}
    </div>
  );
}
