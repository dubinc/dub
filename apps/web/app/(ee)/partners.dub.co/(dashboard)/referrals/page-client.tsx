"use client";

import {
  NETWORK_REFERRAL_REWARD,
  NETWORK_REFERRAL_SWAG_THRESHOLD_CENTS,
} from "@/lib/partner-referrals/constants";
import { useNetworkReferrals } from "@/lib/partner-referrals/hooks/use-network-referrals";
import { useNetworkReferralsStats } from "@/lib/partner-referrals/hooks/use-network-referrals-stats";
import { useNetworkReferralsTimeseries } from "@/lib/partner-referrals/hooks/use-network-referrals-timeseries";
import { NetworkReferralProps } from "@/lib/partner-referrals/types";
import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
import {
  Button,
  Copy,
  CopyText,
  MiniAreaChart,
  Table,
  TimestampTooltip,
  Tooltip,
  useCopyToClipboard,
  useMediaQuery,
  usePagination,
  useTable,
} from "@dub/ui";
import { Gift, UserArrowRight } from "@dub/ui/icons";
import {
  COUNTRIES,
  currencyFormatter,
  DUB_LOGO,
  formatDate,
  getPrettyUrl,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Check, HelpCircle, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ComponentType, ReactNode, useMemo } from "react";
import { toast } from "sonner";

function useNetworkReferralAccess() {
  const { partner, loading } = usePartnerProfile();

  const profileReady = !loading && !!partner;
  const isEligible =
    partner?.networkStatus === "approved" ||
    partner?.networkStatus === "trusted";

  const referralLink = constructPartnerReferralLink({
    partner,
  });

  return {
    partner,
    loading,
    profileReady,
    isEligible,
    referralLink,
  };
}

const REFERRALS_EMPTY_STATE_CARD_PARTNERS = [
  {
    name: "Derek Forbes",
    index: 0,
    earningsCents: 124_500,
  },
  {
    name: "Lauren Anderson",
    index: 1,
    earningsCents: 89_200,
  },
  {
    name: "Elias Weber",
    index: 4,
    earningsCents: 210_000,
  },
] as const;

function ReferralsEmptyState({
  title,
  description,
  button,
}: {
  title: string;
  description: ReactNode;
  button?: ReactNode;
}) {
  return (
    <AnimatedEmptyState
      title={title}
      description={description}
      cardContent={(idx) => {
        const partner =
          REFERRALS_EMPTY_STATE_CARD_PARTNERS[
            idx % REFERRALS_EMPTY_STATE_CARD_PARTNERS.length
          ];

        return (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="size-7 shrink-0 rounded-full border border-neutral-300 bg-neutral-300"
              style={{
                backgroundImage:
                  "url(https://assets.dub.co/partners/partner-images.jpg)",
                backgroundSize: "1400%",
                backgroundPositionX: (14 - (partner.index % 14)) * 100 + "%",
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0">
              <span className="text-content-default block truncate text-xs font-semibold leading-tight">
                {partner.name}
              </span>
              <span className="text-content-subtle block truncate text-[11px] font-medium leading-none">
                Your earnings:{" "}
                {currencyFormatter(partner.earningsCents, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        );
      }}
      cardClassName="p-3 opacity-70"
      addButton={button}
    />
  );
}

function ReferralsStatItem({
  label,
  tooltipContent,
  children,
  isLoading,
  chartData,
}: {
  label: ReactNode;
  tooltipContent: string;
  children: ReactNode;
  isLoading: boolean;
  chartData?: { date: Date; value: number }[] | null;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 pr-0">
      <div className="flex items-center gap-1">
        <span className="text-content-default text-sm font-medium">
          {label}
        </span>
        <Tooltip content={tooltipContent} side="top">
          <HelpCircle className="size-3.5 text-neutral-500" />
        </Tooltip>
      </div>

      <div className="flex items-end gap-4">
        <span className="text-content-emphasis whitespace-nowrap text-3xl font-medium tabular-nums">
          {isLoading ? (
            <span
              aria-hidden="true"
              className="mt-2 block h-8 w-[4.75rem] animate-pulse rounded-md bg-neutral-200"
            />
          ) : (
            children
          )}
        </span>
        {chartData && chartData.length > 0 && (
          <div className="relative h-10 flex-1">
            <MiniAreaChart data={chartData} padding={{ top: 8, bottom: 8 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReferralsStats() {
  const {
    loading: partnerLoading,
    profileReady,
    isEligible,
  } = useNetworkReferralAccess();

  const { data: stats, isLoading: statsLoading } = useNetworkReferralsStats({
    enabled: profileReady && isEligible,
  });

  const { data: timeseries } = useNetworkReferralsTimeseries({
    enabled: profileReady && isEligible,
  });

  const partnersChartData = (timeseries || [])?.map((d) => ({
    date: new Date(d.start),
    value: d.partners,
  }));

  const earningsChartData = (timeseries || [])?.map((d) => ({
    date: new Date(d.start),
    value: d.earnings,
  }));

  return (
    <div className="grid grid-cols-2 divide-x divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
      <ReferralsStatItem
        label="Referred partners"
        tooltipContent="Partners who joined Dub Partners using your referral link."
        isLoading={partnerLoading || statsLoading}
        chartData={partnersChartData}
      >
        {stats?.count ?? 0}
      </ReferralsStatItem>

      <ReferralsStatItem
        label="Your earnings"
        tooltipContent="Total commission earned from your referrals."
        isLoading={partnerLoading || statsLoading}
        chartData={earningsChartData}
      >
        {currencyFormatter(stats?.totalEarnings ?? 0, {
          trailingZeroDisplay: "stripIfInteger",
        })}
      </ReferralsStatItem>
    </div>
  );
}

function ReferralLinkLocked() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-content-default mb-2 text-sm font-semibold">
        Referral link
      </p>
      <div className="rounded-xl border border-neutral-200 p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white sm:size-10"
              aria-hidden
            >
              <Lock className="size-4 text-neutral-900" strokeWidth={2} />
            </span>
            <span className="text-content-default min-w-0 text-sm font-medium leading-snug">
              Get accepted to the Dub Network to unlock
            </span>
          </div>
          <Link href="/profile" className="shrink-0">
            <Button text="Apply" variant="primary" className="h-9 w-fit px-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReferralLink() {
  const { profileReady, isEligible, referralLink } = useNetworkReferralAccess();
  const [copied, copyToClipboard] = useCopyToClipboard();
  const { isMobile } = useMediaQuery();

  const copyReferralLink = () => {
    if (!referralLink) return;
    toast.promise(copyToClipboard(referralLink), {
      success: "Copied referral link to clipboard!",
    });
  };

  if (!profileReady) {
    return null;
  }

  if (!isEligible) {
    return <ReferralLinkLocked />;
  }

  if (!referralLink) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-content-default mb-2 text-sm font-semibold">
        Referral link
      </p>
      <div className="rounded-xl border border-neutral-200 p-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative flex size-9 shrink-0 items-center justify-center sm:size-10">
              <div className="absolute inset-0 rounded-full border border-neutral-200">
                <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
              </div>
              <img
                src={DUB_LOGO}
                alt="Dub Partners"
                className="relative z-10 size-6 shrink-0 rounded-full"
              />
            </div>
            <CopyText
              className="text-content-default min-w-0 truncate text-sm font-semibold"
              value={referralLink}
            >
              {getPrettyUrl(referralLink)}
            </CopyText>
          </div>
          <Button
            text={isMobile ? undefined : "Copy link"}
            variant="primary"
            icon={
              copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )
            }
            className="h-9 w-fit shrink-0"
            onClick={copyReferralLink}
            aria-label="Copy referral link"
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
          Earn {NETWORK_REFERRAL_REWARD.amountInPercentage}% of your referred
          partners&apos; payout fees for the first{" "}
          {NETWORK_REFERRAL_REWARD.maxDuration} months
        </ReferralRewardListItem>

        <ReferralRewardListItem icon={Gift}>
          Unlock premium Dub swag once you cross{" "}
          {currencyFormatter(NETWORK_REFERRAL_SWAG_THRESHOLD_CENTS, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{" "}
          in referral bonus earnings
        </ReferralRewardListItem>
      </ul>
    </div>
  );
}

function ReferredPartners() {
  const {
    loading: partnerLoading,
    profileReady,
    isEligible,
    referralLink,
  } = useNetworkReferralAccess();

  const {
    data: referredPartners,
    isLoading,
    error,
  } = useNetworkReferrals({
    enabled: profileReady && isEligible,
  });

  const [copied, copyToClipboard] = useCopyToClipboard();

  const copyReferralLink = () => {
    if (!referralLink) return;
    toast.promise(copyToClipboard(referralLink), {
      success: "Copied referral link to clipboard!",
    });
  };

  const { data: stats } = useNetworkReferralsStats({
    enabled: profileReady && isEligible,
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
    loading: isLoading || partnerLoading,
    error: error instanceof Error ? error.message : undefined,
  });

  const hasRows = (referredPartners?.length ?? 0) > 0;

  if (profileReady && !isEligible) {
    return (
      <div className="flex flex-col gap-4">
        <ReferralsEmptyState
          title="No referred partners"
          description="Get accepted to the Dub Network to start earning from referred partners."
          button={
            <Link href="/profile">
              <Button
                text="Apply to the network"
                variant="primary"
                className="h-9"
              />
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading || hasRows || error) {
    return (
      <div className="flex flex-col gap-4">
        <Table {...tableProps} table={table} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ReferralsEmptyState
        title="No referred partners"
        description="Share your referral link to start earning from partners joining the Dub Network."
        button={
          <Button
            text="Copy link"
            icon={
              copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )
            }
            onClick={copyReferralLink}
            className="h-9"
          />
        }
      />
    </div>
  );
}

function ReferralsPromoCard() {
  const cards = [
    {
      containerClassName:
        "absolute left-[calc(50%-122px)] top-[-36px] flex h-[156px] w-[236px] items-center justify-center sm:left-[8px] sm:translate-x-0 lg:left-[8px]",
      transform: "rotate(-14deg) scaleY(0.99) skewX(7deg)",
    },
    {
      containerClassName:
        "absolute left-[calc(50%-60px)] top-[-20px] flex h-[125px] w-[220px] items-center justify-center sm:left-[68px] sm:translate-x-0 lg:left-[68px]",
      transform: "rotate(-3.38deg) scaleY(0.99) skewX(7deg)",
    },
    {
      containerClassName:
        "absolute left-[calc(50%+12px)] top-[-30px] flex h-[161px] w-[207px] items-center justify-center sm:left-[151px] sm:translate-x-0 lg:left-[151px]",
      transform: "rotate(13.59deg) scaleY(0.99) skewX(7deg)",
    },
  ] as const;

  const cardShadow =
    "-53px 97px 31px rgba(0,0,0,0.01), -34px 62px 28px rgba(0,0,0,0.06), -19px 35px 24px rgba(0,0,0,0.19), -8px 16px 18px rgba(0,0,0,0.32), -2px 4px 10px rgba(0,0,0,0.37)";

  return (
    <div className="relative isolate flex min-h-[280px] w-full flex-col justify-end overflow-hidden rounded-xl bg-neutral-800 p-5 lg:h-full lg:min-h-0">
      <div
        className="pointer-events-none absolute inset-0 overflow-visible"
        aria-hidden
      >
        {cards.map(({ containerClassName, transform }, idx) => (
          <div key={idx} className={containerClassName}>
            <div className="flex-none origin-center" style={{ transform }}>
              <div
                className="relative h-[115px] w-[199px] overflow-hidden rounded-[6px]"
                style={{ boxShadow: cardShadow }}
              >
                <Image
                  src="https://assets.dub.co/misc/network-referral-card.png"
                  alt=""
                  width={398}
                  height={230}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-[1] mt-auto space-y-2 pt-[88px] sm:pt-[84px]">
        <p className="text-base font-semibold text-white">
          Dub Network Referrals
        </p>
        <p className="text-sm font-normal text-neutral-200">
          Bring on other partners to the Dub network, and earn from their
          activity for up to {NETWORK_REFERRAL_REWARD.maxDuration} months.{" "}
          {/* <Link
            href="https://dub.co/docs/partners/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-200 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-300"
          >
            Learn more
          </Link> */}
        </p>
      </div>
    </div>
  );
}

export function NetworkReferralsPageClient() {
  return (
    <PageContent title="Referrals">
      <PageWidthWrapper className="flex flex-col gap-6 pb-10">
        <div className="rounded-xl bg-neutral-100 p-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(268px,22rem)] lg:items-stretch">
              <div className="order-2 flex min-h-0 flex-col gap-4 lg:order-1">
                <ReferralsStats />
                <ReferralLink />
              </div>
              <div className="order-1 lg:order-2">
                <ReferralsPromoCard />
              </div>
            </div>
            <ReferralRewards />
          </div>
        </div>
        <ReferredPartners />
      </PageWidthWrapper>
    </PageContent>
  );
}
