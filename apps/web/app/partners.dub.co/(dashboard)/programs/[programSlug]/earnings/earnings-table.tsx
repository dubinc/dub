"use client";

import usePartnerEarningsCount from "@/lib/swr/use-partner-earnings-count";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerEarningsResponse } from "@/lib/types";
import FilterButton from "@/ui/analytics/events/filter-button";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { SaleStatusBadges } from "@/ui/partners/sale-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  CopyText,
  LinkLogo,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDollar } from "@dub/ui/icons";
import {
  currencyFormatter,
  fetcher,
  formatDate,
  formatDateTime,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import { Cell } from "@tanstack/react-table";
import useSWR from "swr";

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<PartnerEarningsResponse, any>, "getValue">,
  ) => Record<string, any>;
};

export function EarningsTablePartner({ limit }: { limit?: number }) {
  const { programEnrollment } = useProgramEnrollment();
  const { queryParams, searchParamsObj, getQueryString } = useRouterStuff();

  const { sortBy = "createdAt", sortOrder = "desc" } = searchParamsObj as {
    sortBy?: "createdAt";
    sortOrder?: "asc" | "desc";
  };

  const { earningsCount } = usePartnerEarningsCount<{ count: number }>({
    enabled: programEnrollment ? true : false,
  });

  const {
    data: earnings,
    isLoading,
    error,
  } = useSWR<PartnerEarningsResponse[]>(
    programEnrollment &&
      `/api/partner-profile/programs/${programEnrollment.programId}/earnings${getQueryString(
        limit ? { pageSize: limit } : {},
      )}`,
    fetcher,
  );

  const { pagination, setPagination } = usePagination(limit);

  const { table, ...tableProps } = useTable({
    data: earnings || [],
    loading: isLoading,
    error: error ? "Failed to fetch earnings." : undefined,
    columns: [
      {
        id: "createdAt",
        header: "Date",
        accessorKey: "timestamp",
        cell: ({ row }) => (
          <p title={formatDateTime(row.original.createdAt)}>
            {formatDate(row.original.createdAt, { month: "short" })}
          </p>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "type",
        meta: {
          filterParams: ({ getValue }) => ({
            type: getValue(),
          }),
        },
        cell: ({ row }) => <CommissionTypeBadge type={row.original.type} />,
      },
      {
        id: "link",
        header: "Link",
        accessorKey: "link",
        meta: {
          filterParams: ({ getValue }) => ({
            linkId: getValue().id,
          }),
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <LinkLogo
              apexDomain={getApexDomain(row.original.link.url)}
              className="size-4 shrink-0 sm:size-4"
            />
            <CopyText
              value={row.original.link.shortLink}
              successMessage="Copied link to clipboard!"
              className="truncate"
            >
              <span className="truncate" title={row.original.link.shortLink}>
                {getPrettyUrl(row.original.link.shortLink)}
              </span>
            </CopyText>
          </div>
        ),
        size: 250,
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
        meta: {
          filterParams: ({ getValue }) =>
            getValue()
              ? {
                  customerId: getValue().id,
                }
              : {},
        },
        cell: ({ row }) =>
          row.original.customer ? row.original.customer.email : "-",
        size: 250,
      },
      {
        id: "amount",
        header: "Sale Amount",
        accessorKey: "amount",
        cell: ({ row }) =>
          row.original.amount
            ? currencyFormatter(row.original.amount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        id: "earnings",
        header: "Earnings",
        accessorKey: "earnings",
        cell: ({ row }) =>
          currencyFormatter(row.original.earnings / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = SaleStatusBadges[row.original.status];

          return (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          );
        },
      },
    ],
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
      return (
        meta?.filterParams && <FilterButton set={meta.filterParams(cell)} />
      );
    },
    ...(!limit && {
      pagination,
      onPaginationChange: setPagination,
      sortableColumns: ["createdAt", "amount", "earnings"],
      sortBy,
      sortOrder,
      onSortChange: ({ sortBy, sortOrder }) =>
        queryParams({
          set: {
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
          },
          del: "page",
          scroll: false,
        }),
      enableColumnResizing: true,
    }),
    rowCount: earningsCount?.count || 0,
    emptyState: (
      <AnimatedEmptyState
        title="No earnings found"
        description="No earnings have been made for this program yet."
        cardContent={() => (
          <>
            <CircleDollar className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
      />
    ),
    resourceName: (plural) => `earning${plural ? "s" : ""}`,
  });

  return isLoading || earnings?.length ? (
    <Table
      {...tableProps}
      table={table}
      containerClassName="border-neutral-200"
    />
  ) : (
    <AnimatedEmptyState
      title="No earnings found"
      description="No earnings have been made for this program yet."
      cardContent={() => (
        <>
          <CircleDollar className="size-4 text-neutral-700" />
          <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
    />
  );
}
