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
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
import {
  Button,
  Copy,
  LinkLogo,
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
  getApexDomain,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { HelpCircle } from "lucide-react";
import { ComponentType, ReactNode, useMemo } from "react";
import { toast } from "sonner";

// TODO:
// 1 - loading state
// 2 - Empty state
// 3 - Not accessible
// 4 - Mobile UI

function ReferralsStatItem({
  label,
  tooltipContent,
  children,
}: {
  label: ReactNode;
  tooltipContent: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <div className="flex items-center gap-1">
        <span className="text-content-default text-sm font-medium">
          {label}
        </span>
        <Tooltip content={tooltipContent} side="top">
          <HelpCircle className="size-3.5 text-neutral-500" />
        </Tooltip>
      </div>

      <span className="text-content-emphasis text-3xl font-medium tabular-nums">
        {children}
      </span>
    </div>
  );
}

function ReferralsStats() {
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useNetworkReferralsStats({
    enabled: true,
  });

  return (
    <div className="grid grid-cols-2 divide-x divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
      <ReferralsStatItem
        label="Partners"
        tooltipContent="Partners who joined Dub Partners using your referral link."
      >
        {stats?.count}
      </ReferralsStatItem>

      <ReferralsStatItem
        label="Your earnings"
        tooltipContent="Total commission earned from your referrals."
      >
        {currencyFormatter(stats?.totalEarnings ?? 0, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </ReferralsStatItem>
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

  if (!referralLink || !partner) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-content-default mb-2 text-sm font-semibold">
        Referral link
      </p>
      <div className="rounded-xl border border-neutral-200 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center">
              <div className="absolute inset-0 h-9 w-9 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
                <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
              </div>
              <div className="relative z-10 p-2">
                <LinkLogo
                  apexDomain={getApexDomain(referralLink)}
                  className="size-4 sm:size-6"
                  imageProps={{
                    loading: "lazy",
                  }}
                />
              </div>
            </div>
            <span className="text-content-default text-sm font-semibold">
              {referralLink}
            </span>
          </div>
          <Button
            text="Copy link"
            variant="primary"
            icon={<Copy className="size-4" />}
            className="w-fit"
            onClick={copyReferralLink}
          />
        </div>
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
        <Icon className="size-4 text-neutral-800" />
      </span>
      <span className="text-content-default text-sm font-medium">
        {props.children}
      </span>
    </li>
  );
}

function ReferralRewards() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-content-default mb-2 text-sm font-semibold">
        Referral Rewards
      </p>
      <ul className="flex flex-col gap-2">
        <ReferralRewardListItem icon={UserArrowRight}>
          You get {NETWORK_BONUS_REWARD.amountInPercentage}% of your
          referees&apos; payout fees for the first{" "}
          {NETWORK_BONUS_REWARD.maxDuration} months.
        </ReferralRewardListItem>

        <ReferralRewardListItem icon={Gift}>
          Unlock premium Dub swag once you cross{" "}
          {currencyFormatter(NETWORK_REFERRAL_SWAG_THRESHOLD_CENTS, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{" "}
          in referral bonus earnings.
        </ReferralRewardListItem>
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

  // if (partnerLoading) {
  //   return (
  //     <PageContent title="Referrals">
  //       <PageWidthWrapper className="pb-10">
  //         <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
  //       </PageWidthWrapper>
  //     </PageContent>
  //   );
  // }

  // if (!isEligible) {
  //   return (
  //     <PageContent title="Referrals">
  //       <PageWidthWrapper className="flex flex-col gap-3 pb-10">
  //         <div className="text-content-inverted overflow-hidden rounded-2xl bg-neutral-900 p-6">
  //           <h2 className="text-lg font-semibold">
  //             Join the Dub Partner Network
  //           </h2>
  //           <p className="text-content-inverted/60 mt-2 text-sm">
  //             Complete your Dub Partner Network application and get approved to
  //             refer other partners to Dub and track them here.
  //           </p>
  //           <div className="mt-4">
  //             <Link href="/profile">
  //               <Button variant="primary" text="Apply to the network" />
  //             </Link>
  //           </div>
  //         </div>
  //       </PageWidthWrapper>
  //     </PageContent>
  //   );
  // }

  return (
    <PageContent title="Referrals">
      <PageWidthWrapper className="flex flex-col gap-6 pb-10">
        <div className="rounded-xl bg-neutral-100 p-4">
          <div className="flex flex-col gap-4">
            <ReferralsStats />
            <ReferralLink />
            <ReferralRewards />
          </div>
        </div>
        <ReferredPartners />
      </PageWidthWrapper>
    </PageContent>
  );
}

{
  /* <NetworkReferralsPromoCard className="lg:col-start-2 lg:row-start-1" /> */
}
