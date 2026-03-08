"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { referralSchema } from "@/lib/zod/schemas/referrals";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, fetcher, formatDate, OG_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import * as z from "zod/v4";
import { useProgramReferralsCount } from "../../lib/swr/use-program-referrals-count";
import { ReferralSheet } from "./partner-referral-sheet";
import { ReferralStatusBadges } from "./referral-status-badges";
import { getCompanyLogoUrl } from "./referral-utils";
import { useProgramReferralsFilters } from "./use-program-referral-filters";

type PartnerReferralProps = z.infer<typeof referralSchema>;

export function PartnerReferralTable() {
  const { getQueryString, queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const referralIdFromUrl = searchParams.get("referralId");

  const [detailsSheetState, setDetailsSheetState] = useState<{
    referralId: string | null;
    open: boolean;
  }>({
    referralId: referralIdFromUrl,
    open: !!referralIdFromUrl,
  });

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = useProgramReferralsFilters({});

  const { data: referralsCount, error: countError } =
    useProgramReferralsCount();

  const {
    data: referrals,
    error,
    isLoading,
  } = useSWR<PartnerReferralProps[]>(
    `/api/programs/${defaultProgramId}/referrals${getQueryString({
      workspaceId,
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

  const columns = [
    {
      id: "lead",
      header: "Lead",
      enableHiding: false,
      minSize: 250,
      cell: ({ row }: { row: Row<PartnerReferralProps> }) => {
        const referral = row.original;
        const companyLogoUrl = getCompanyLogoUrl(referral.email);

        return (
          <div className="flex items-center gap-2 truncate">
            <img
              alt={referral.email}
              src={companyLogoUrl || `${OG_AVATAR_URL}${referral.id}`}
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
          <span>{formatDate(row.original.createdAt, { month: "short" })}</span>
        </TimestampTooltip>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: { row: Row<PartnerReferralProps> }) => {
        const status = row.original.status;
        const badge = ReferralStatusBadges[status];

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
  ].filter((c) => referralsColumns.all.includes(c.id));

  const { table, ...tableProps } = useTable({
    data: referrals || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner referral${p ? "s" : ""}`,
    rowCount: referralsCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load referrals" : undefined,
    onRowClick: (row) => {
      queryParams({
        set: { referralId: row.original.id },
        scroll: false,
      });
      setDetailsSheetState({
        referralId: row.original.id,
        open: true,
      });
    },
  });

  const currentReferral = useMemo(() => {
    if (!referrals || !detailsSheetState.referralId) return null;
    return referrals.find((r) => r.id === detailsSheetState.referralId) || null;
  }, [referrals, detailsSheetState.referralId]);

  const [previousReferralId, nextReferralId] = useMemo(() => {
    if (!referrals || !detailsSheetState.referralId) return [null, null];

    const currentIndex = referrals.findIndex(
      ({ id }) => id === detailsSheetState.referralId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? referrals[currentIndex - 1].id : null,
      currentIndex < referrals.length - 1
        ? referrals[currentIndex + 1].id
        : null,
    ];
  }, [referrals, detailsSheetState.referralId]);

  // Sync state with URL params
  useEffect(() => {
    const urlReferralId = searchParams.get("referralId");
    if (urlReferralId && urlReferralId !== detailsSheetState.referralId) {
      setDetailsSheetState({
        referralId: urlReferralId,
        open: true,
      });
    } else if (!urlReferralId && detailsSheetState.referralId) {
      setDetailsSheetState({
        referralId: null,
        open: false,
      });
    }
  }, [searchParams, detailsSheetState.referralId]);

  return (
    <div className="flex flex-col gap-3">
      {detailsSheetState.referralId && currentReferral && (
        <ReferralSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          referral={currentReferral}
          onPrevious={
            previousReferralId
              ? () => {
                  queryParams({
                    set: { referralId: previousReferralId },
                    scroll: false,
                  });
                  setDetailsSheetState({
                    referralId: previousReferralId,
                    open: true,
                  });
                }
              : undefined
          }
          onNext={
            nextReferralId
              ? () => {
                  queryParams({
                    set: { referralId: nextReferralId },
                    scroll: false,
                  });
                  setDetailsSheetState({
                    referralId: nextReferralId,
                    open: true,
                  });
                }
              : undefined
          }
        />
      )}
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onSearchChange={setSearch}
            onSelectedFilterChange={setSelectedFilter}
          />
          <SearchBoxPersisted
            placeholder="Search by email or name"
            inputClassName="md:w-[16rem]"
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
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
