"use client";

import { useNetworkReferralFilters } from "@/lib/partner-referrals/hooks/use-network-referral-filters";
import { useNetworkReferrals } from "@/lib/partner-referrals/hooks/use-network-referrals";
import { useNetworkReferralsCount } from "@/lib/partner-referrals/hooks/use-network-referrals-count";
import { NetworkReferralProps } from "@/lib/partner-referrals/types";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
import {
  AnimatedSizeContainer,
  Button,
  Copy,
  Filter,
  Table,
  TimestampTooltip,
  usePagination,
  useTable,
} from "@dub/ui";
import { Users6 } from "@dub/ui/icons";
import {
  COUNTRIES,
  PARTNERS_DOMAIN,
  currencyFormatter,
  formatDate,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

export function NetworkReferralsPageClient() {
  const { partner, loading: partnerLoading } = usePartnerProfile();

  const isEligible =
    partner?.networkStatus === "approved" ||
    partner?.networkStatus === "trusted";

  const {
    data: referredPartners,
    isLoading,
    error,
  } = useNetworkReferrals({
    enabled: isEligible,
  });

  const { data: referredPartnersCount, error: countError } =
    useNetworkReferralsCount({
      enabled: isEligible,
    });

  const { pagination, setPagination } = usePagination(100);

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSelectedFilter,
  } = useNetworkReferralFilters({ enabled: isEligible });

  const referralLink =
    partner?.username && isEligible
      ? `${PARTNERS_DOMAIN}/register?via=${partner.username}`
      : null;

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }: { row: Row<NetworkReferralProps> }) => (
          <PartnerRowItem
            partner={{
              ...row.original,
              name: row.original.email,
              image: null,
            }}
            showPermalink={false}
          />
        ),
      },
      {
        id: "country",
        header: "Country",
        minSize: 150,
        cell: ({ row }: { row: Row<NetworkReferralProps> }) => {
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
        id: "createdAt",
        header: "Signed up",
        cell: ({ row }: { row: Row<NetworkReferralProps> }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            rows={["local"]}
            side="left"
            delayDuration={150}
          >
            <span>
              {formatDate(row.original.createdAt, {
                month: "short",
              })}
            </span>
          </TimestampTooltip>
        ),
      },
      {
        id: "earnings",
        header: "Earnings",
        minSize: 120,
        meta: {
          headerTooltip: "Total commission earned from this partner.",
        },
        cell: ({ row }: { row: Row<NetworkReferralProps> }) =>
          currencyFormatter(row.original.earnings / 100, {
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
    loading: isEligible && isLoading,
    error:
      error instanceof Error
        ? error.message
        : countError
          ? "Failed to load referred partners"
          : undefined,
  });

  if (partnerLoading) {
    return (
      <PageContent title="Referrals">
        <PageWidthWrapper className="pb-10">
          <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
        </PageWidthWrapper>
      </PageContent>
    );
  }

  if (!isEligible) {
    return (
      <PageContent title="Referrals">
        <PageWidthWrapper className="flex flex-col gap-3 pb-10">
          <div className="text-content-inverted overflow-hidden rounded-2xl bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold">
              Join the Dub Partner Network
            </h2>
            <p className="text-content-inverted/60 mt-2 text-sm">
              Complete your Dub Partner Network application and get approved to
              refer other partners to Dub and track them here.
            </p>
            <div className="mt-4">
              <Link href="/profile">
                <Button variant="secondary" text="Go to profile" />
              </Link>
            </div>
          </div>
        </PageWidthWrapper>
      </PageContent>
    );
  }

  return (
    <PageContent title="Referrals">
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
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    toast.success("Copied referral link to clipboard!");
                  }}
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
                  : "Share your referral link to invite other partners to join Dub Partners. When they sign up through your link, they'll appear here."
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
                    text="Copy link"
                    icon={<Copy className="size-4" />}
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                    }}
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
