"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  getPartnerReferralsQuerySchema,
  partnerReferralSchema,
} from "@/lib/zod/schemas/partner-referrals";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  EditColumnsButton,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots } from "@dub/ui/icons";
import { cn, fetcher, formatDate, OG_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useMemo } from "react";
import useSWR from "swr";
import * as z from "zod/v4";
import { PartnerReferralStatusBadges } from "./partner-referral-status-badges";
import { usePartnerReferralsCount } from "./use-partner-referrals-count";

type PartnerReferralProps = z.infer<typeof partnerReferralSchema>;

export function PartnerReferralTable({
  query,
}: {
  query?: Partial<z.infer<typeof getPartnerReferralsQuerySchema>>;
}) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const { data: referralsCount, error: countError } = usePartnerReferralsCount({
    enabled: true,
    query,
  });

  const {
    data: referrals,
    error,
    isLoading,
  } = useSWR<PartnerReferralProps[]>(
    `/api/programs/partner-referrals${getQueryString({
      workspaceId,
      ...query,
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const referralsColumns = {
    all: ["lead", "company", "partner", "submitted", "status"],
    defaultVisible: ["lead", "company", "partner", "submitted", "status"],
  };

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "partner-referrals-table-columns",
    referralsColumns,
  );

  const { pagination, setPagination } = usePagination();

  const columns = useMemo(
    () =>
      [
        {
          id: "lead",
          header: "Lead",
          enableHiding: false,
          minSize: 250,
          cell: ({ row }: { row: Row<PartnerReferralProps> }) => {
            const referral = row.original;
            return (
              <div className="flex items-center gap-2 truncate">
                <img
                  alt={referral.email}
                  src={`${OG_AVATAR_URL}${referral.id}`}
                  className="size-5 shrink-0 rounded-full border border-neutral-200"
                />
                <span className="truncate" title={referral.email}>
                  {referral.email}
                </span>
              </div>
            );
          },
        },
        {
          id: "company",
          header: "Company",
          accessorKey: "company",
          minSize: 150,
          cell: ({ row }: { row: Row<PartnerReferralProps> }) => {
            return (
              <span className="min-w-0 truncate" title={row.original.company}>
                {row.original.company}
              </span>
            );
          },
        },
        {
          id: "partner",
          header: "Partner",
          minSize: 200,
          cell: ({ row }: { row: Row<PartnerReferralProps> }) => {
            return (
              <PartnerRowItem
                partner={row.original.partner}
                showPermalink={true}
                showFraudIndicator={false}
              />
            );
          },
        },
        {
          id: "submitted",
          header: "Submitted",
          cell: ({ row }: { row: Row<PartnerReferralProps> }) => (
            <TimestampTooltip
              timestamp={row.original.createdAt}
              rows={["local"]}
              side="left"
              delayDuration={150}
            >
              <span>
                {formatDate(row.original.createdAt, { month: "short" })}
              </span>
            </TimestampTooltip>
          ),
        },
        {
          id: "status",
          header: "Status",
          accessorKey: "status",
          cell: ({ row }: { row: Row<PartnerReferralProps> }) => {
            const status = row.original.status;
            const badge = PartnerReferralStatusBadges[status];
            return (
              <StatusBadge
                variant={badge.variant}
                icon={null}
                className={cn("border-0", badge.className)}
              >
                {badge.label}
              </StatusBadge>
            );
          },
        },
        // Menu
        {
          id: "menu",
          enableHiding: false,
          minSize: 43,
          size: 43,
          maxSize: 43,
          header: () => <EditColumnsButton table={table} />,
          cell: ({ row }: { row: Row<PartnerReferralProps> }) => (
            <RowMenuButton row={row} />
          ),
        },
      ].filter((c) => c.id === "menu" || referralsColumns.all.includes(c.id)),
    [workspaceSlug],
  );

  const { table, ...tableProps } = useTable({
    data: referrals || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    columnPinning: { right: ["menu"] },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner referral${p ? "s" : ""}`,
    rowCount: referralsCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load referrals" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchBoxPersisted
            placeholder="Search by email or name"
            inputClassName="md:w-[16rem]"
          />
        </div>
      </div>
      {referrals?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No referrals submitted"
          description="Allow partners to submit leads and track their progress through the sales process."
          learnMoreHref="https://dub.co/help/article/partner-rewards"
          cardContent={
            <>
              <div className="bg-bg-emphasis h-2.5 w-24 min-w-0 rounded-sm" />
            </>
          }
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<PartnerReferralProps> }) {
  return (
    <button
      type="button"
      className="h-8 whitespace-nowrap px-2 disabled:border-transparent disabled:bg-transparent"
    >
      <Dots className="h-4 w-4 shrink-0" />
    </button>
  );
}
