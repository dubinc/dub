"use client";

import {
  NETWORK_BONUS_REWARD,
  NETWORK_REFERRAL_SWAG_THRESHOLD_CENTS,
} from "@/lib/partner-referrals/constants";
import { useNetworkReferrals } from "@/lib/partner-referrals/hooks/use-network-referrals";
import { useNetworkReferralsStats } from "@/lib/partner-referrals/hooks/use-network-referrals-stats";
import { NetworkReferralProps } from "@/lib/partner-referrals/types";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
import {
  Button,
  Copy,
  Table,
  TimestampTooltip,
  Tooltip,
  useCopyToClipboard,
  usePagination,
  useTable,
} from "@dub/ui";
import { Gift, UserArrowRight, Users6 } from "@dub/ui/icons";
import {
  COUNTRIES,
  PARTNERS_DOMAIN,
  currencyFormatter,
  formatDate,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { ComponentType, ReactNode, useMemo } from "react";
import { toast } from "sonner";
import { NetworkReferralsPromoCard } from "./network-referrals-promo-card";

function ReferralsStats() {
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useNetworkReferralsStats({
    enabled: true,
  });

  return (
    <div className="grid grid-cols-2 divide-x divide-neutral-200 border-b border-neutral-200">
      <div className="flex flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium leading-3 text-neutral-500 sm:text-sm">
            Partners
          </span>
          <Tooltip
            content="Partners who joined Dub Partners using your referral link."
            side="top"
          >
            <div>
              <HelpCircle className="size-3.5 text-neutral-500" />
            </div>
          </Tooltip>
        </div>
        {statsLoading && !stats ? (
          <div className="h-7 w-12 animate-pulse rounded bg-neutral-200 sm:h-8 sm:w-16" />
        ) : (
          <span className="text-xl font-semibold tabular-nums text-neutral-900 sm:text-2xl">
            {statsError ? "—" : stats?.count ?? 0}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium leading-3 text-neutral-500 sm:text-sm">
            Your earnings
          </span>
          <Tooltip
            content="Total referral commission earned from the Dub Partner Network program."
            side="top"
          >
            <div>
              <HelpCircle className="size-3.5 text-neutral-500" />
            </div>
          </Tooltip>
        </div>

        {statsLoading && !stats ? (
          <div className="h-7 w-20 animate-pulse rounded bg-neutral-200 sm:h-8 sm:w-28" />
        ) : (
          <span className="text-xl font-semibold tabular-nums text-neutral-900 sm:text-2xl">
            {statsError
              ? "—"
              : currencyFormatter(stats?.totalEarnings ?? 0, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </span>
        )}
      </div>
    </div>
  );
}

function ReferralLink() {
  const { partner } = usePartnerProfile();
  const [, copyToClipboard] = useCopyToClipboard();

  const referralLink = partner?.username
    ? `${PARTNERS_DOMAIN}/register?via=${partner.username}`
    : null;

  const copyReferralLink = () => {
    if (!referralLink) return;
    toast.promise(copyToClipboard(referralLink), {
      success: "Copied referral link to clipboard!",
    });
  };

  if (!referralLink) {
    return null;
  }

  return (
    <div className="border-b border-neutral-200 px-3 py-3 sm:px-4 sm:py-4">
      <p className="mb-2 text-sm font-medium text-neutral-900">Referral link</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        <div className="relative min-h-[52px] flex-1">
          <div className="flex h-full min-h-[52px] items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-14 sm:pr-3">
            <PartnerAvatar
              partner={{
                id: partner?.id,
                name: partner?.name,
                email: partner?.email,
                image: partner?.image,
              }}
              className="size-8 shrink-0"
            />
            <span className="min-w-0 truncate text-sm text-neutral-800">
              {referralLink}
            </span>
          </div>
          <Button
            variant="primary"
            icon={<Copy className="size-4" />}
            className="absolute right-1.5 top-1/2 size-9 shrink-0 -translate-y-1/2 p-0 sm:hidden"
            onClick={copyReferralLink}
            aria-label="Copy referral link"
          />
        </div>
        <Button
          variant="primary"
          text="Copy link"
          icon={<Copy className="size-4" />}
          className="hidden h-9 shrink-0 px-4 sm:flex"
          onClick={copyReferralLink}
        />
      </div>
    </div>
  );
}

function ReferralRewardListItem(props: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const Icon = props.icon;

  return (
    <li className="flex gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        <Icon className="size-4 text-neutral-700" />
      </span>
      <span className="text-sm leading-5 text-neutral-600">
        {props.children}
      </span>
    </li>
  );
}

function ReferralRewards() {
  const rewardItems = [
    {
      id: "network-commission",
      icon: UserArrowRight,
      content: (
        <>
          You get {NETWORK_BONUS_REWARD.amountInPercentage}% of your
          referees&apos; payout fees for the first{" "}
          {NETWORK_BONUS_REWARD.maxDuration} months.
        </>
      ),
    },
    {
      id: "swag-threshold",
      icon: Gift,
      content: (
        <>
          Unlock premium Dub swag once you cross{" "}
          {currencyFormatter(NETWORK_REFERRAL_SWAG_THRESHOLD_CENTS, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{" "}
          in referral bonus earnings.
        </>
      ),
    },
  ] as const;

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4">
      <p className="mb-3 text-sm font-medium text-neutral-900">
        Referral Rewards
      </p>
      <ul className="flex flex-col gap-3">
        {rewardItems.map((item) => (
          <ReferralRewardListItem key={item.id} icon={item.icon}>
            {item.content}
          </ReferralRewardListItem>
        ))}
      </ul>
    </div>
  );
}

function ReferredPartners() {
  const { partner } = usePartnerProfile();

  const {
    data: referredPartners,
    isLoading,
    error,
  } = useNetworkReferrals({
    enabled: true,
  });

  const [, copyToClipboard] = useCopyToClipboard();

  const referralLink = partner?.username
    ? `${PARTNERS_DOMAIN}/register?via=${partner.username}`
    : null;

  const copyReferralLink = () => {
    if (!referralLink) return;
    toast.promise(copyToClipboard(referralLink), {
      success: "Copied referral link to clipboard!",
    });
  };

  const { data: stats } = useNetworkReferralsStats({
    enabled: true,
  });

  const { pagination, setPagination } = usePagination(100);

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
              name: row.original.email ?? "",
              image: null,
            }}
            showPermalink={false}
          />
        ),
      },
      {
        id: "createdAt",
        header: "Joined",
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
        id: "activeProgramsCount",
        header: "Active programs",
        minSize: 150,
        cell: ({ row }: { row: Row<NetworkReferralProps> }) => {
          return row.original.activeProgramsCount;
        },
      },
      {
        id: "totalEarnings",
        header: "Your earnings",
        minSize: 120,
        meta: {
          headerTooltip: "Total commission earned from this partner.",
        },
        cell: ({ row }: { row: Row<NetworkReferralProps> }) =>
          currencyFormatter(row.original.totalEarnings, {
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
    rowCount: stats?.count ?? 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      {referredPartners?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No referred partners yet"
          description="Share your referral link to invite other partners to join Dub Partners. When they sign up through your link, they'll appear here."
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
                onClick={copyReferralLink}
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}

export function NetworkReferralsPageClient() {
  const { partner, loading: partnerLoading } = usePartnerProfile();

  const isEligible =
    partner?.networkStatus === "approved" ||
    partner?.networkStatus === "trusted";

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
                <Button variant="primary" text="Apply to the network" />
              </Link>
            </div>
          </div>
        </PageWidthWrapper>
      </PageContent>
    );
  }

  return (
    <PageContent title="Referrals">
      <PageWidthWrapper className="flex flex-col gap-6 pb-10">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="grid grid-cols-1 gap-6 p-4 sm:p-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6 lg:p-4">
            <NetworkReferralsPromoCard className="lg:col-start-2 lg:row-start-1" />
            <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
              <ReferralsStats />
              <ReferralLink />
              <ReferralRewards />
            </div>
          </div>
        </div>
        <ReferredPartners />
      </PageWidthWrapper>
    </PageContent>
  );
}
