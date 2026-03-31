"use client";

import usePartnerReferrals from "@/lib/swr/use-partner-referrals";
import usePartnerReferralsCount from "@/lib/swr/use-partner-referrals-count";
import { PartnerProfileReferralsCountByStatus } from "@/lib/types";
import { PartnerProfileReferral } from "@/lib/zod/schemas/partner-profile";
import { PartnerProfileReferralSheet } from "@/ui/referrals/partner-profile-referral-sheet";
import { PartnerProfileReferralsEmptyState } from "@/ui/referrals/partner-profile-referrals-empty-state";
import { ReferralStatusBadges } from "@/ui/referrals/referral-status-badges";
import { getCompanyLogoUrl } from "@/ui/referrals/referral-utils";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { ReferralStatus } from "@dub/prisma/client";
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
import { CircleDotted } from "@dub/ui/icons";
import { cn, formatDate, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

export default function PartnerCustomersReferralsPage() {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();

  const referralIdFromUrl = searchParams.get("referralId");

  const [detailsSheetState, setDetailsSheetState] = useState<{
    referralId: string | null;
    open: boolean;
  }>({
    referralId: referralIdFromUrl,
    open: !!referralIdFromUrl,
  });

  const { searchParamsObj } = useRouterStuff();
  const status = searchParamsObj.status as ReferralStatus | undefined;
  const search = searchParamsObj.search as string | undefined;

  const { data: referralsCountByStatus } = usePartnerReferralsCount<
    PartnerProfileReferralsCountByStatus[] | undefined
  >({
    query: {
      groupBy: "status",
    },
  });

  const { data: totalReferralsCount, error: countError } =
    usePartnerReferralsCount<number>({
      query: {
        ...(status && { status }),
        ...(search && { search }),
      },
    });

  const { data: referrals, error, isLoading } = usePartnerReferrals();

  const referralsColumns = {
    all: ["lead", "name", "company", "submitted", "status"],
    defaultVisible: ["lead", "name", "company", "submitted", "status"],
  };

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "partner-profile-referrals-table-columns",
    referralsColumns,
  );

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          referralsCountByStatus?.map(({ status, _count }) => {
            const badge = ReferralStatusBadges[status];
            const Icon = badge.icon;

            return {
              value: status,
              label: badge.label,
              icon: (
                <Icon
                  className={cn(badge.className, "size-4 bg-transparent")}
                />
              ),
              right: nFormatter(_count, { full: true }),
            };
          }) ?? [],
        meta: {
          filterParams: ({ getValue }: { getValue: () => string }) => ({
            status: getValue(),
          }),
        },
      },
    ],
    [referralsCountByStatus],
  );

  const activeFilters = useMemo(() => {
    return [...(status ? [{ key: "status", value: status }] : [])];
  }, [status]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "search"],
    });

  const columns = useMemo(
    () =>
      [
        {
          id: "lead",
          header: "Lead",
          enableHiding: false,
          minSize: 250,
          cell: ({ row }: { row: Row<PartnerProfileReferral> }) => {
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
          id: "name",
          header: "Name",
          accessorKey: "name",
          minSize: 150,
          cell: ({ row }: { row: Row<PartnerProfileReferral> }) => {
            return (
              <span className="min-w-0 truncate" title={row.original.name}>
                {row.original.name}
              </span>
            );
          },
        },
        {
          id: "company",
          header: "Company",
          accessorKey: "company",
          minSize: 150,
          cell: ({ row }: { row: Row<PartnerProfileReferral> }) => {
            return (
              <span className="min-w-0 truncate" title={row.original.company}>
                {row.original.company}
              </span>
            );
          },
        },
        {
          id: "submitted",
          header: "Submitted",
          cell: ({ row }: { row: Row<PartnerProfileReferral> }) => (
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
          cell: ({ row }: { row: Row<PartnerProfileReferral> }) => {
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
      ].filter((c) => referralsColumns.all.includes(c.id)),
    [],
  );

  const { table, ...tableProps } = useTable({
    data: referrals || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `referral${p ? "s" : ""}`,
    rowCount: totalReferralsCount || 0,
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
        <PartnerProfileReferralSheet
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
      {referrals && referrals.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : !isLoading ? (
        <PartnerProfileReferralsEmptyState />
      ) : null}
    </div>
  );
}
