"use client";

import { formatCommissionDescriptionTooltip } from "@/lib/commissions/format-commission-description-tooltip";
import { usePartnerLinksDisplay } from "@/lib/swr/use-partner-links-display";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  usePartnerProfileEarnings,
  usePartnerProfileEarningsCount,
} from "@/lib/swr/use-partner-profile-earnings";
import useProgramEnrollment, {
  getShowDetailedAnalytics,
} from "@/lib/swr/use-program-enrollment";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerProfileEarningsResponse } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
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
  formatDateTimeSmart,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { Cell } from "@tanstack/react-table";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { usePartnerEarningsFilters } from "./use-partner-earnings-filters";

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<PartnerProfileEarningsResponse, any>, "getValue">,
  ) => Record<string, any>;
};

// the earnings of one program, or of all programs on the All programs page (no programSlug)
export function EarningsTablePartner({ limit }: { limit?: number }) {
  const { programSlug } = useParams<{ programSlug?: string }>();
  const { partner } = usePartnerProfile();
  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment();

  // the enrollment of each row's program, for the All programs page
  const { programEnrollments } = useProgramEnrollments();
  const programEnrollmentsById = useMemo(
    () =>
      new Map(
        programEnrollments?.map((enrollment) => [
          enrollment.programId,
          enrollment,
        ]),
      ),
    [programEnrollments],
  );

  const getRowProgramEnrollment = (row: PartnerProfileEarningsResponse) =>
    programSlug
      ? programEnrollment
      : programEnrollmentsById.get(row.program.id);
  const { queryParams, searchParamsObj } = useRouterStuff();
  const { displayProperties } = usePartnerLinksDisplay();
  const filters = usePartnerEarningsFilters();

  const { sortBy = "createdAt", sortOrder = "desc" } = searchParamsObj as {
    sortBy?: "createdAt" | "amount" | "earnings";
    sortOrder?: "asc" | "desc";
  };

  const { pagination, setPagination } = usePagination(limit);

  // the table only shows the count with pagination, and a limit turns pagination off
  const { data: earningsCount } = usePartnerProfileEarningsCount({
    ...filters,
    enabled: !limit,
  });

  const {
    data: earnings,
    isLoading,
    error,
  } = usePartnerProfileEarnings({
    ...filters,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sortBy,
    sortOrder,
  });

  const emptyStateDescription = programSlug
    ? "No earnings have been made for this program yet."
    : "No earnings have been made yet.";

  const { table, ...tableProps } = useTable({
    data: earnings || [],
    loading: isLoading,
    error: error ? "Failed to fetch earnings." : undefined,
    columns: [
      ...(programSlug
        ? []
        : [
            {
              id: "program",
              header: "Program",
              minSize: 160,
              meta: {
                filterParams: ({ row }) => ({
                  programId: row.original.program.id,
                }),
              },
              cell: ({ row }) => (
                <Link
                  href={`/programs/${row.original.program.slug}`}
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <ProgramLogo
                    program={row.original.program}
                    className="size-4"
                  />
                  <span className="truncate">{row.original.program.name}</span>
                </Link>
              ),
            },
          ]),
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
        cell: ({ row }) => {
          const link = row.original.link;
          const referralLink = link
            ? {
                apexDomain: getApexDomain(link.url),
                shortLink: link.shortLink,
                label:
                  displayProperties.includes("title") && link.partnerLinkTitle
                    ? link.partnerLinkTitle
                    : getPrettyUrl(link.shortLink),
              }
            : row.original.type === CommissionType.referral && partner?.username
              ? {
                  apexDomain: "dub.co",
                  shortLink: `https://partners.dub.co/${row.original.program.slug}/apply?via=${partner.username}`,
                  label: getPrettyUrl(
                    `https://partners.dub.co/${row.original.program.slug}/apply?via=${partner.username}`,
                  ),
                }
              : null;

          if (!referralLink) return "-";

          return (
            <div className="flex items-center gap-3">
              <LinkLogo
                apexDomain={referralLink.apexDomain}
                className="size-4 shrink-0 sm:size-4"
              />
              <CopyText
                value={referralLink.shortLink}
                successMessage="Copied link to clipboard!"
                className="truncate"
              >
                <span className="truncate" title={referralLink.label}>
                  {referralLink.label}
                </span>
              </CopyText>
            </div>
          );
        },
        size: 250,
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 250,
        cell: ({ row }) => {
          const rowProgramEnrollment = getRowProgramEnrollment(row.original);
          const showCustomerLink = programSlug
            ? showDetailedAnalytics
            : rowProgramEnrollment &&
              getShowDetailedAnalytics(rowProgramEnrollment);

          return row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              href={
                showCustomerLink
                  ? `/programs/${row.original.program.slug}/customers/${row.original.customer.id}`
                  : undefined
              }
              className="px-4 py-2.5"
            />
          ) : (
            <p className="px-4 py-2.5">-</p>
          );
        },
        meta: {
          filterParams: ({ row }) =>
            row.original.customer
              ? {
                  customerId: row.original.customer.id,
                }
              : null,
        },
      },
      // the All programs page always shows the sale amount
      ...(!programSlug ||
      programEnrollment?.rewards?.some((r) => r.event === "sale")
        ? [
            {
              id: "amount",
              header: "Sale Amount",
              accessorKey: "amount",
              // the header and the sort icon need more than the default 120px
              size: 150,
              minSize: 150,
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
              cell: ({ row }) => {
                if (!row.original.customer) return "-";
                const country = row.original.customer.country;

                return (
                  <div
                    className="flex items-center gap-3"
                    title={country ? COUNTRIES[country] ?? country : undefined}
                  >
                    {country ? (
                      <CountryFlag countryCode={country} />
                    ) : (
                      <Globe className="size-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {(country ? COUNTRIES[country] || country : null) ?? "-"}
                    </span>
                  </div>
                );
              },
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
            return (
              <Tooltip
                content={formatCommissionDescriptionTooltip(
                  commission.description,
                  { variant: "partner" },
                )}
              >
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
          const rowProgramEnrollment = getRowProgramEnrollment(row.original);

          return (
            <StatusBadge
              icon={null}
              variant={badge.variant}
              tooltip={badge.tooltip({
                // without the enrollment (for example a deactivated program), the
                // tooltip still links to the program, without its minimum payout
                program: rowProgramEnrollment?.program ?? {
                  ...row.original.program,
                  minPayoutAmount: 0,
                },
                group: rowProgramEnrollment?.group ?? undefined,
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
        }),
      enableColumnResizing: true,
    }),
    rowCount: earningsCount?.count || 0,
    tdClassName: (columnId) => (columnId === "customer" ? "p-0" : ""),
    emptyState: (
      <AnimatedEmptyState
        title="No earnings found"
        description={emptyStateDescription}
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
      description={emptyStateDescription}
      cardContent={() => (
        <>
          <CircleDollar className="size-4 text-neutral-700" />
          <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
    />
  );
}
