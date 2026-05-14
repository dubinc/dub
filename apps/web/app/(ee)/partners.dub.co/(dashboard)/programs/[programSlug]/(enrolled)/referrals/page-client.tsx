"use client";

import { useReferredPartnerFilters } from "@/lib/partner-referrals/hooks/use-referred-partner-filters";
import { useReferredPartners } from "@/lib/partner-referrals/hooks/use-referred-partners";
import { useReferredPartnersCount } from "@/lib/partner-referrals/hooks/use-referred-partners-count";
import { ReferredPartnerProps } from "@/lib/partner-referrals/types";
import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
import {
  AnimatedSizeContainer,
  Button,
  Copy,
  Filter,
  StatusBadge,
  Table,
  TimestampTooltip,
  useCopyToClipboard,
  usePagination,
  useTable,
} from "@dub/ui";
import { Users6 } from "@dub/ui/icons";
import { COUNTRIES, currencyFormatter, formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { notFound } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

export function PartnerReferralsPageClient() {
  const { programEnrollment } = useProgramEnrollment();
  const { partner } = usePartnerProfile();

  if (programEnrollment && !programEnrollment.referralRewardId) {
    notFound();
  }

  const { data: referredPartners, isLoading, error } = useReferredPartners();

  const { data: referredPartnersCount, error: countError } =
    useReferredPartnersCount();

  const { pagination, setPagination } = usePagination(100);

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSelectedFilter,
  } = useReferredPartnerFilters();

  const referralLink = constructPartnerReferralLink({
    partner,
    program: programEnrollment?.program,
  });

  const [, copyToClipboard] = useCopyToClipboard();

  const copyReferralLink = () => {
    if (!referralLink) return;
    toast.promise(copyToClipboard(referralLink), {
      success: "Copied referral link to clipboard!",
    });
  };

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }: { row: Row<ReferredPartnerProps> }) => {
          return (
            <PartnerRowItem
              partner={{
                ...row.original,
                name: row.original.email ?? "",
                image: null,
              }}
              showPermalink={false}
            />
          );
        },
      },
      {
        id: "status",
        header: "Status",
        minSize: 120,
        cell: ({ row }: { row: Row<ReferredPartnerProps> }) => {
          const badge =
            PartnerStatusBadges[row.original.programEnrollment.status];
          return (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          );
        },
      },
      {
        id: "createdAt",
        header: "Enrolled",
        cell: ({ row }: { row: Row<ReferredPartnerProps> }) => (
          <TimestampTooltip
            timestamp={row.original.programEnrollment.createdAt}
            rows={["local"]}
            side="left"
            delayDuration={150}
          >
            <span>
              {formatDate(row.original.programEnrollment.createdAt, {
                month: "short",
              })}
            </span>
          </TimestampTooltip>
        ),
      },
      {
        id: "country",
        header: "Country",
        minSize: 150,
        cell: ({ row }: { row: Row<ReferredPartnerProps> }) => {
          const country = row.original.country;
          return (
            <div className="flex items-center gap-2">
              {country && <CountryFlag countryCode={country} />}
              <span className="min-w-0 truncate">
                {(country ? COUNTRIES[country] : null) ?? "-"}
              </span>
            </div>
          );
        },
      },
      {
        id: "earnings",
        header: "Earnings",
        minSize: 120,
        meta: {
          headerTooltip: "Total commission earned from this partner.",
        },
        cell: ({ row }: { row: Row<ReferredPartnerProps> }) =>
          currencyFormatter(row.original.programEnrollment.earnings, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: referredPartners || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: referredPartnersCount || 0,
    loading: isLoading,
    error:
      error instanceof Error
        ? error.message
        : countError
          ? "Failed to load referred partners"
          : undefined,
  });

  return (
    <PageContent title="Referred partners">
      <PageWidthWrapper className="flex flex-col gap-3 pb-10">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Filter.Select
                className="w-full md:w-fit"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onSelectedFilterChange={setSelectedFilter}
              />
              {referralLink && (
                <Button
                  variant="primary"
                  text="Copy link"
                  icon={<Copy className="size-4" />}
                  className="h-9 w-fit"
                  onClick={copyReferralLink}
                />
              )}
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

          {referredPartners?.length !== 0 ? (
            <Table {...tableProps} table={table} />
          ) : (
            <AnimatedEmptyState
              title={
                isFiltered
                  ? "No referred partners found"
                  : "No referred partners yet"
              }
              description={
                isFiltered
                  ? "No referred partners found for the selected filters. Adjust your filters to refine your search results."
                  : "Share your referral link to invite other partners to join this program. When they sign up through your link, they'll appear here."
              }
              cardContent={() => (
                <>
                  <Users6 className="size-4 text-neutral-700" />
                  <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                </>
              )}
              addButton={
                referralLink ? (
                  <Button
                    text="Copy referral link"
                    onClick={copyReferralLink}
                  />
                ) : undefined
              }
            />
          )}
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
