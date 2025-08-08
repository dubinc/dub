"use client";

import usePartnerEarningsCount from "@/lib/swr/use-partner-earnings-count";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerEarningsResponse } from "@/lib/types";
import { CLAWBACK_REASONS_MAP } from "@/lib/zod/schemas/commissions";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import {
  CopyText,
  LinkLogo,
  StatusBadge,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDollar } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  formatDateTimeSmart,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import { Cell } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import useSWR from "swr";

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<PartnerEarningsResponse, any>, "getValue">,
  ) => Record<string, any>;
};

export function EarningsTablePartner({ limit }: { limit?: number }) {
  const { programSlug } = useParams();
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
    { keepPreviousData: true },
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
        minSize: 140,
        cell: ({ row }) => (
          <p title={formatDateTime(row.original.createdAt)}>
            {formatDateTimeSmart(row.original.createdAt)}
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
          filterParams: ({ row }) =>
            row.original.link ? { linkId: row.original.link.id } : null,
        },
        cell: ({ row }) =>
          row.original.link ? (
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
          ) : (
            "-"
          ),
        size: 250,
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 250,
        cell: ({ row }) =>
          row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              href={`/programs/${programSlug}/customers/${row.original.customer.id}`}
              className="px-4 py-2.5"
            />
          ) : (
            <p className="px-4 py-2.5">-</p>
          ),
        meta: {
          filterParams: ({ row }) =>
            row.original.customer
              ? {
                  customerId: row.original.customer.id,
                }
              : null,
        },
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
        cell: ({ row }) => {
          const commission = row.original;

          const earnings = currencyFormatter(commission.earnings / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          if (commission.description) {
            const reason =
              CLAWBACK_REASONS_MAP[commission.description]?.description ??
              commission.description;

            return (
              <Tooltip content={reason}>
                <span
                  className={cn(
                    "cursor-help truncate underline decoration-dotted underline-offset-2",
                    commission.earnings < 0 && "text-red-600",
                  )}
                >
                  {earnings}
                </span>
              </Tooltip>
            );
          }

          return (
            <span
              className={cn(
                commission.earnings < 0 && "text-red-600",
                "truncate",
              )}
            >
              {earnings}
            </span>
          );
        },
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = CommissionStatusBadges[row.original.status];

          return (
            <StatusBadge
              icon={null}
              variant={badge.variant}
              tooltip={badge.tooltip({
                holdingPeriodDays:
                  programEnrollment?.program.holdingPeriodDays ?? 0,
                minPayoutAmount:
                  programEnrollment?.program.minPayoutAmount ?? 0,
                supportEmail:
                  programEnrollment?.program.supportEmail ?? "support@dub.co",
              })}
            >
              {badge.label}
            </StatusBadge>
          );
        },
      },
    ],
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
      return (
        meta?.filterParams &&
        meta.filterParams(cell) && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
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
    tdClassName: (columnId) => (columnId === "customer" ? "p-0" : ""),
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
