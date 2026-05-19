"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";
import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { QueryLinkStructureHelpText } from "@/lib/partners/query-link-structure-help-text";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramRewardModifiersTooltip } from "@/ui/partners/program-reward-modifiers-tooltip";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  Button,
  buttonVariants,
  CopyText,
  Gift,
  Icon,
  LinkLogo,
  StatusBadge,
  Tooltip,
  useCopyToClipboard,
  useRouterStuff,
} from "@dub/ui";
import {
  Areas,
  ChartContext,
  ChartTooltipSync,
  TimeSeriesChart,
  XAxis,
} from "@dub/ui/charts";
import {
  Check,
  Copy,
  CursorRays,
  InvoiceDollar,
  LoadingSpinner,
  ReferredVia,
  UserPlus,
} from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { LinearGradient } from "@visx/gradient";
import { endOfDay, startOfDay } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createContext,
  CSSProperties,
  ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import { EarningsTablePartner } from "./earnings/earnings-table";
import { PayoutsCard } from "./payouts-card";
import { ShareEarningsModal } from "./share-earnings-modal";

const ProgramOverviewContext = createContext<{
  start?: Date;
  end?: Date;
  interval: IntervalOptions;
  color?: string;
}>({
  interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
});

export function PartnerProgramOverviewPageClient() {
  const { getQueryString, searchParamsObj } = useRouterStuff();
  const { programSlug } = useParams();

  const [hideDetails, _setHideDetails] = useSyncedLocalStorage(
    `hide-program-details:${programSlug}`,
    false,
  );

  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment();

  const {
    start,
    end,
    interval = DUB_PARTNERS_ANALYTICS_INTERVAL,
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const program = programEnrollment?.program;

  if (!program) {
    return null;
  }

  return (
    <PageWidthWrapper className="pb-10">
      {program && (
        <AnimatePresence mode="wait" initial={false}>
          {!hideDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                opacity: { duration: 0.2 },
              }}
              className="overflow-hidden"
            >
              <div className="mb-10">
                <RewardList />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <ProgramOverviewContext.Provider
        value={{
          start: start ? startOfDay(new Date(start)) : undefined,
          end: end ? endOfDay(new Date(end)) : undefined,
          interval,
          color: programEnrollment.group?.brandColor ?? undefined,
        }}
      >
        <ChartTooltipSync>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="group rounded-xl border border-neutral-200 p-5 pb-3 pt-4 lg:col-span-2">
              <EarningsChart />
            </div>

            <PayoutsCard programId={program?.id} />
            <NumberFlowGroup>
              {showDetailedAnalytics ? (
                <>
                  <StatCard title="Clicks" event="clicks" />
                  <StatCard title="Leads" event="leads" />
                  <StatCard title="Sales" event="sales" />
                </>
              ) : (
                <>
                  <StatCardSimple title="Clicks" event="clicks" />
                  <StatCardSimple title="Leads" event="leads" />
                  <StatCardSimple title="Sales" event="sales" />
                </>
              )}
            </NumberFlowGroup>
          </div>
        </ChartTooltipSync>
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Recent earnings
            </h2>
            <Link
              href={`/programs/${programSlug}/earnings${getQueryString()}`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 items-center rounded-lg border px-2 text-sm",
              )}
            >
              View all
            </Link>
          </div>
        </div>
        <div className="mt-4">
          <EarningsTablePartner limit={10} />
        </div>
      </ProgramOverviewContext.Provider>
    </PageWidthWrapper>
  );
}

function EarningsChart() {
  const { programSlug } = useParams();
  const { getQueryString } = useRouterStuff();
  const { start, end, interval } = useContext(ProgramOverviewContext);
  const [showShareModal, setShowShareModal] = useState(false);

  const { programEnrollment } = useProgramEnrollment();

  const { data: timeseries, error } = usePartnerEarningsTimeseries({
    interval,
    start,
    end,
  });

  const { data: analyticsData } = usePartnerAnalytics({
    event: "composite",
    groupBy: "count",
    interval,
    start,
    end,
  });

  const total = useMemo(
    () => timeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [timeseries],
  );

  const totalClicks = useMemo(
    () => analyticsData?.clicks ?? 0,
    [analyticsData],
  );

  const epc = useMemo(() => {
    if (!total || !totalClicks || totalClicks === 0) return 0;
    return total / totalClicks;
  }, [total, totalClicks]);

  const data = useMemo(
    () =>
      timeseries?.map(({ start, earnings }) => ({
        date: new Date(start),
        value: earnings,
      })),
    [timeseries],
  );

  return (
    <div>
      {programEnrollment?.program && (
        <ShareEarningsModal
          showModal={showShareModal}
          setShowModal={setShowShareModal}
          programId={programEnrollment.program.id}
          start={start}
          end={end}
          interval={interval}
          timeseries={timeseries}
        />
      )}
      <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-0">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="block text-base font-semibold leading-none text-neutral-800">
                Earnings
              </span>
              <Tooltip content="Share chart">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex size-6 items-center justify-center rounded-md border border-transparent text-neutral-500 transition-colors hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-700"
                >
                  <ReferredVia className="size-3.5" />
                </button>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-2">
              {total !== undefined ? (
                <>
                  <NumberFlow
                    className="text-lg font-medium leading-none text-neutral-600"
                    value={total / 100}
                    format={{
                      style: "currency",
                      currency: "USD",
                      // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                      trailingZeroDisplay: "stripIfInteger",
                    }}
                  />
                  {total > 0 && analyticsData && (
                    <NumberFlow
                      className="text-sm font-medium leading-none text-neutral-500/80"
                      value={epc / 100}
                      format={{
                        style: "currency",
                        currency: "USD",
                        // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                        trailingZeroDisplay: "stripIfInteger",
                      }}
                      suffix=" EPC"
                    />
                  )}
                </>
              ) : (
                <div className="h-[27px] w-24 animate-pulse rounded-md bg-neutral-200" />
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <ViewMoreButton
            href={`/programs/${programSlug}/earnings${getQueryString()}`}
          />
          <SimpleDateRangePicker
            className="h-7 min-w-0 flex-1 px-2.5 text-xs font-medium md:w-fit md:flex-none"
            align="end"
          />
        </div>
      </div>
      <div className="relative mt-2 h-44 w-full">
        {error ? (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm text-neutral-500">
              Failed to load earnings data.
            </span>
          </div>
        ) : timeseries === undefined ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : data && data.length > 0 ? (
          <BrandedChart data={data} currency />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm text-neutral-500">No data available</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  event,
}: {
  title: string;
  event: "clicks" | "leads" | "sales";
}) {
  const { programSlug } = useParams();
  const { getQueryString } = useRouterStuff();
  const { start, end, interval } = useContext(ProgramOverviewContext);

  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    event: "composite",
    interval,
    start,
    end,
  });

  const totals = useMemo(() => {
    return timeseries && timeseries.length > 0
      ? timeseries.reduce(
          (acc, { clicks, leads, sales }) => ({
            clicks: acc.clicks + clicks,
            leads: acc.leads + leads,
            sales: acc.sales + sales,
          }),
          { clicks: 0, leads: 0, sales: 0 },
        )
      : { clicks: 0, leads: 0, sales: 0 };
  }, [timeseries]);

  return (
    <div className="group block rounded-xl border border-neutral-200 bg-white p-5 pb-3">
      <div className="flex justify-between">
        <div>
          <span className="mb-1 block text-base font-semibold leading-none text-neutral-800">
            {title}
          </span>
          {totals !== undefined ? (
            <div className="flex items-center gap-1 text-lg font-medium text-neutral-600">
              <NumberFlow
                value={totals[event]}
                format={{
                  notation: totals[event] > 999999 ? "compact" : "standard",
                }}
              />
            </div>
          ) : (
            <div className="h-[27px] w-16 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <ViewMoreButton
          href={`/programs/${programSlug}/analytics?event=${event}${getQueryString()?.replace("?", "&")}`}
        />
      </div>
      <div className="mt-2 h-44 w-full">
        {error ? (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm text-neutral-500">
              Failed to load data.
            </span>
          </div>
        ) : timeseries === undefined ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : timeseries.length > 0 ? (
          <BrandedChart
            data={timeseries.map((d) => ({
              date: new Date(d.start),
              value: d[event],
            }))}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm text-neutral-500">No data available</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCardSimple({
  title,
  event,
}: {
  title: string;
  event: "clicks" | "leads" | "sales";
}) {
  const { data: total } = usePartnerAnalytics({
    event: "composite",
  });

  const iconMap = {
    clicks: CursorRays,
    leads: UserPlus,
    sales: InvoiceDollar,
  };

  const Icon = iconMap[event];

  return (
    <div className="relative block rounded-xl border border-neutral-200 bg-white px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
          <Icon className="size-5 text-neutral-700" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="block text-sm font-medium text-neutral-600">
            {title}
          </span>
          {total !== undefined ? (
            <NumberFlow
              className="text-xl font-semibold text-neutral-900"
              value={total[event]}
              format={{
                notation: total[event] > 999999 ? "compact" : "standard",
              }}
            />
          ) : (
            <div className="mt-0.5 h-7 w-12 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
      <div className="absolute right-6 top-4 text-xs text-neutral-400">
        All-time data
      </div>
    </div>
  );
}

function BrandedChart({
  data: dataProp,
  currency,
}: {
  data: { date: Date; value: number }[];
  currency?: boolean;
}) {
  const id = useId();

  const { programEnrollment } = useProgramEnrollment();
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const data = useMemo(() => {
    return dataProp.map((d) => ({
      date: new Date(d.date),
      values: { main: d.value },
    }));
  }, [dataProp]);

  return (
    <div
      className="relative size-full"
      style={{ "--color": color || "#DA2778" } as CSSProperties}
    >
      <TimeSeriesChart
        data={data}
        series={[
          {
            id: "main",
            valueAccessor: (d) => d.values.main,
            colorClassName: "text-[var(--color)]",
            isActive: true,
          },
        ]}
        tooltipClassName="p-0"
        tooltipContent={(d) => {
          return (
            <>
              <div className="flex justify-between gap-6 whitespace-nowrap p-2 text-xs leading-none">
                <span className="font-medium text-neutral-700">
                  {formatDateTooltip(d.date, {
                    interval,
                    start,
                    end,
                    dataAvailableFrom:
                      programEnrollment?.program.startedAt ??
                      programEnrollment?.program.createdAt,
                  })}
                </span>
                <p className="text-right text-neutral-500">
                  {currency
                    ? currencyFormatter(d.values.main)
                    : nFormatter(d.values.main)}
                </p>
              </div>
            </>
          );
        }}
      >
        <ChartContext.Consumer>
          {(context) => (
            <LinearGradient
              id={`${id}-color-gradient`}
              from={color || "#7D3AEC"}
              to={color || "#DA2778"}
              x1={0}
              x2={context?.width ?? 1}
              gradientUnits="userSpaceOnUse"
            />
          )}
        </ChartContext.Consumer>

        <XAxis
          showAxisLine={false}
          tickFormat={(date) =>
            formatDateTooltip(date, { interval, start, end })
          }
        />
        <Areas
          seriesStyles={[
            {
              id: "main",
              areaFill: `url(#${id}-color-gradient)`,
              lineStroke: `url(#${id}-color-gradient)`,
              lineClassName: "text-[var(--color)]",
            },
          ]}
        />
      </TimeSeriesChart>
    </div>
  );
}

function ViewMoreButton({ href }: { href: string }) {
  return (
    <div className="-mr-2 overflow-hidden pr-2 [mask-image:linear-gradient(270deg,transparent,black_8px)] [mask-origin:padding-box]">
      <div className="overflow-visible transition-all duration-200 focus-within:w-[82px] focus-within:opacity-100 group-hover:w-[82px] group-hover:opacity-100 lg:w-0 lg:opacity-0">
        <Link
          href={href}
          className={cn(
            "flex h-7 w-[82px] items-center justify-center whitespace-nowrap rounded-md border px-0 text-xs font-medium",
            buttonVariants({ variant: "secondary" }),
          )}
        >
          View more
        </Link>
      </div>
    </div>
  );
}

function RewardsTermsList() {
  const { programEnrollment } = useProgramEnrollment();

  if (!programEnrollment) {
    return null;
  }

  const minPayoutAmount = programEnrollment.program.minPayoutAmount ?? 0;
  const holdingPeriodDays = programEnrollment.group?.holdingPeriodDays ?? 0;

  const items = [
    ...(minPayoutAmount > 0
      ? [
          {
            label: "minimum payout",
            value: currencyFormatter(minPayoutAmount, {
              trailingZeroDisplay: "stripIfInteger",
            }),
            href: "https://dub.co/help/article/commissions-payouts#what-does-minimum-payout-amount-mean",
          },
        ]
      : []),
    ...(holdingPeriodDays > 0
      ? [
          {
            label: "holding period",
            value: `${holdingPeriodDays}-day`,
            href: "https://dub.co/help/article/commissions-payouts#what-does-holding-period-mean",
          },
        ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
      {items.map((item, idx) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span>
            <span className="font-semibold text-neutral-600">{item.value}</span>{" "}
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-500 underline decoration-dotted underline-offset-2"
            >
              {item.label}
            </a>
          </span>
          {idx < items.length - 1 && (
            <span className="font-semibold text-neutral-600">•</span>
          )}
        </span>
      ))}
    </div>
  );
}

function RewardList() {
  const { programEnrollment } = useProgramEnrollment();
  const { partner } = usePartnerProfile();

  if (!programEnrollment) {
    return null;
  }

  const eligibleRewards = (programEnrollment.rewards ?? []).filter(
    (r) => getRewardAmount(r) >= 0,
  );

  const standardRewards = eligibleRewards.filter(
    (reward) =>
      reward.event === "click" ||
      reward.event === "lead" ||
      reward.event === "sale",
  );

  const referralRewards = eligibleRewards.filter(
    (reward) => reward.event === "referral",
  );

  const discount = programEnrollment.discount ?? null;
  const showReferralRewardCard = referralRewards.length > 0;

  const defaultProgramLink = programEnrollment.links?.[0];
  const partnerLink = constructPartnerLink({
    group: programEnrollment.group,
    link: defaultProgramLink,
  });
  const hasPartnerLink = Boolean(partnerLink);
  const isDeactivated = programEnrollment.status === "deactivated";

  const partnerReferralApplyLink = constructPartnerReferralLink({
    partner,
    program: programEnrollment.program,
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-100 p-2">
      <RewardListItem
        title={showReferralRewardCard ? "Customer referral rewards" : "Rewards"}
        titleRight={<RewardsTermsList />}
        isDeactivated={isDeactivated}
        rewards={[
          ...standardRewards.map((reward) => ({
            id: reward.id,
            icon: REWARD_EVENT_ICON[reward.event],
            text: (
              <>
                {formatRewardDescription(reward, { includeEarnPrefix: false })}
                {(!!reward.modifiers?.length ||
                  Boolean(reward.tooltipDescription)) && (
                  <>
                    {" "}
                    <ProgramRewardModifiersTooltip reward={reward} />
                  </>
                )}
              </>
            ),
          })),
          ...(discount
            ? [
                {
                  id: "discount",
                  icon: Gift,
                  text: formatDiscountDescription(discount),
                },
              ]
            : []),
        ]}
        link={{
          displayText: hasPartnerLink
            ? getPrettyUrl(partnerLink)
            : "No link yet",
          copyValue: partnerLink,
          apexDomain: defaultProgramLink
            ? getApexDomain(defaultProgramLink.url)
            : null,
        }}
        queryLinkHelpTextLink={
          hasPartnerLink && programEnrollment.group?.linkStructure === "query"
            ? defaultProgramLink
            : undefined
        }
      />

      {showReferralRewardCard && (
        <RewardListItem
          title="Partner referral rewards"
          isDeactivated={isDeactivated}
          rewards={referralRewards.map((reward) => ({
            id: reward.id,
            icon: REWARD_EVENT_ICON.referral,
            text: formatRewardDescription(reward),
            badge: (
              <span className="inline-flex h-4 shrink-0 items-center justify-center rounded-md bg-blue-100 px-1 text-xs font-semibold leading-4 tracking-tight text-blue-600">
                New
              </span>
            ),
          }))}
          link={{
            displayText: getPrettyUrl(partnerReferralApplyLink),
            copyValue: partnerReferralApplyLink,
            apexDomain: "dub.co",
          }}
        />
      )}
    </div>
  );
}

function RewardListItem({
  title,
  titleRight,
  rewards,
  link,
  queryLinkHelpTextLink,
  isDeactivated,
}: {
  title: string;
  titleRight?: ReactNode;
  rewards: {
    id: string;
    text: ReactNode;
    icon: Icon;
    badge?: ReactNode;
  }[];
  link: {
    displayText: string;
    copyValue: string;
    apexDomain?: string | null;
  };
  queryLinkHelpTextLink?: {
    key: string;
    url: string;
    shortLink: string;
  };
  isDeactivated?: boolean;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const [copied, copyToClipboard] = useCopyToClipboard();
  const copyDisabled =
    isDeactivated || !link.copyValue || link.copyValue.length === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4",
        isDeactivated && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight text-neutral-800">
          {title}
        </h3>
        {titleRight}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
        <div className="bg-neutral-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="shrink-0 rounded-full border border-neutral-200 bg-white p-1">
                <LinkLogo
                  apexDomain={link.apexDomain}
                  className="size-4.5 sm:size-4.5 shrink-0 rounded-full"
                  imageProps={{ width: 18, height: 18 }}
                />
              </div>

              <CopyText
                value={link.copyValue}
                className="min-w-0 truncate text-sm font-medium -tracking-wider text-neutral-600"
              >
                {link.displayText}
              </CopyText>
              {queryLinkHelpTextLink && (
                <>
                  <span className="hidden text-sm text-neutral-500 sm:block">
                    →
                  </span>
                  <QueryLinkStructureHelpText
                    link={queryLinkHelpTextLink}
                    className="hidden sm:block"
                  />
                </>
              )}
            </div>
            {isDeactivated ? (
              <StatusBadge variant={PartnerStatusBadges.deactivated.variant}>
                {PartnerStatusBadges.deactivated.label}
              </StatusBadge>
            ) : (
              <Button
                variant="primary"
                disabled={copyDisabled}
                onClick={() => {
                  copyToClipboard(link.copyValue);
                }}
                className={cn(
                  "h-8 w-auto shrink-0 px-3 transition-opacity",
                  !copyDisabled && "hover:opacity-90",
                )}
                icon={
                  <span className="relative size-4">
                    <Copy
                      className={cn(
                        "absolute inset-0 size-4 transition-[transform,opacity]",
                        copied && "translate-y-1 opacity-0",
                      )}
                    />
                    <Check
                      className={cn(
                        "absolute inset-0 size-4 transition-[transform,opacity]",
                        !copied && "translate-y-1 opacity-0",
                      )}
                    />
                  </span>
                }
                text={copied ? "Copied" : "Copy"}
              />
            )}
          </div>
        </div>

        {rewards.length > 0 ? (
          <div className="space-y-2 rounded-t-xl border-t border-neutral-200 bg-white p-3">
            {rewards.map((reward) => {
              const RewardIcon = reward.icon;

              return (
                <div key={reward.id} className="flex items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                    <RewardIcon className="size-4 text-neutral-800" />
                  </div>
                  <div className="text-content-default flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0 text-sm font-semibold leading-5 tracking-tight">
                    {reward.text}
                    {reward.badge}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-t-xl border-t border-neutral-200 bg-white px-4 py-3">
            <p className="text-content-subtle text-sm">
              You are not eligible for any rewards at this time.
            </p>

            {programSlug && (
              <Link href={`/messages/${programSlug}`}>
                <Button
                  variant="secondary"
                  text="Contact program"
                  className="h-8 rounded-lg px-3"
                />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
