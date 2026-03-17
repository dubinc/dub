"use client";

import usePartnerEarningsCount from "@/lib/swr/use-partner-earnings-count";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerEarningsResponse } from "@/lib/types";
import { CLAWBACK_REASONS_MAP } from "@/lib/zod/schemas/commissions";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterIconCell } from "@/ui/shared/filter-icon-cell";
import {
  CopyText,
  LinkLogo,
  StatusBadge,
  Table,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDollar, Globe } from "@dub/ui/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  fetcher,
  formatDateTimeSmart,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function EarningsTablePartner({ limit }: { limit?: number }) {
  const { programSlug } = useParams();
  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment();
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
          <TimestampTooltip
            timestamp={row.original.createdAt}
            side="right"
            rows={["local"]}
          >
            <span>{formatDateTimeSmart(row.original.createdAt)}</span>
          </TimestampTooltip>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <FilterIconCell set={{ type: row.original.type }} />
            <CommissionTypeBadge type={row.original.type} />
          </div>
        ),
      },
      {
        id: "link",
        header: "Link",
        accessorKey: "link",
        cell: ({ row }) =>
          row.original.link ? (
            <div className="flex items-center gap-3">
              <FilterIconCell
                set={{ linkId: row.original.link.id }}
                icon={
                  <LinkLogo
                    apexDomain={getApexDomain(row.original.link.url)}
                    className="size-4 shrink-0 sm:size-4"
                  />
                }
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
            <div className="flex items-center gap-3 px-4 py-2.5">
              <FilterIconCell set={{ customerId: row.original.customer.id }} />
              <CustomerRowItem
                customer={row.original.customer}
                href={
                  showDetailedAnalytics
                    ? `/programs/${programSlug}/customers/${row.original.customer.id}`
                    : undefined
                }
              />
            </div>
          ) : (
            <p className="px-4 py-2.5">-</p>
          ),
      },
      ...(programEnrollment?.rewards?.some((r) => r.event === "sale")
        ? [
            {
              id: "amount",
              header: "Sale Amount",
              accessorKey: "amount",
              cell: ({ row }) =>
                row.original.amount
                  ? currencyFormatter(row.original.amount)
                  : "-",
            },
          ]
        : [
            {
              id: "country",
              header: "Country",
              accessorKey: "customer.country",
              cell: ({ getValue }) => (
                <div
                  className="flex items-center gap-3"
                  title={COUNTRIES[getValue()] ?? getValue()}
                >
                  {getValue() ? (
                    <img
                      alt={getValue()}
                      src={`https://hatscripts.github.io/circle-flags/flags/${getValue().toLowerCase()}.svg`}
                      className="size-4 shrink-0"
                    />
                  ) : (
                    <Globe className="size-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {COUNTRIES[getValue()] || getValue() || "-"}
                  </span>
                </div>
              ),
            },
          ]),
      {
        id: "earnings",
        header: "Earnings",
        accessorKey: "earnings",
        cell: ({ row }) => {
          const commission = row.original;

          const earnings = currencyFormatter(commission.earnings);

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
                program: programEnrollment?.program,
                group: programEnrollment?.group ?? undefined,
                commission: row.original,
                variant: "partner",
              })}
            >
              {badge.label}
            </StatusBadge>
          );
        },
      },
    ],
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
