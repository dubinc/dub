"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { QueryLinkStructureHelpText } from "@/lib/partners/query-link-structure-help-text";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { HeroBackground } from "@/ui/partners/hero-background";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  Button,
  buttonVariants,
  StatusBadge,
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
  UserPlus,
} from "@dub/ui/icons";
import { cn, currencyFormatter, getPrettyUrl, nFormatter } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { LinearGradient } from "@visx/gradient";
import { endOfDay, startOfDay } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createContext,
  CSSProperties,
  useContext,
  useId,
  useMemo,
} from "react";
import { EarningsTablePartner } from "./earnings/earnings-table";
import { PayoutsCard } from "./payouts-card";

const ProgramOverviewContext = createContext<{
  start?: Date;
  end?: Date;
  interval: IntervalOptions;
  color?: string;
}>({
  interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
});

export default function ProgramPageClient() {
  const { getQueryString, searchParamsObj } = useRouterStuff();
  const { programSlug } = useParams();

  const [hideDetails, _setHideDetails] = useSyncedLocalStorage(
    `hide-program-details:${programSlug}`,
    false,
  );

  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment();
  const [copied, copyToClipboard] = useCopyToClipboard();

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
  const defaultProgramLink = programEnrollment?.links?.[0];

  if (!program) {
    return null;
  }

  const partnerLink = constructPartnerLink({
    group: programEnrollment.group,
    link: defaultProgramLink,
  });

  const isDeactivated = programEnrollment?.status === "deactivated";

  return (
    <PageWidthWrapper className="pb-10">
      {partnerLink && (
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
              <div
                className={cn(
                  "relative z-0 mb-4 flex flex-col overflow-hidden rounded-lg border border-neutral-300 p-4 sm:mb-10 md:p-6",
                  isDeactivated && "opacity-80",
                )}
              >
                {program && (
                  <HeroBackground
                    logo={programEnrollment.group?.logo}
                    color={programEnrollment.group?.brandColor}
                  />
                )}

                <span className="text-base font-semibold text-neutral-800">
                  Referral link
                </span>
                <div className="xs:flex-row xs:items-center relative mt-3 flex flex-col gap-2 md:max-w-[50%]">
                  {partnerLink ? (
                    <input
                      type="text"
                      readOnly
                      value={getPrettyUrl(partnerLink)}
                      disabled={isDeactivated}
                      className={cn(
                        "border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-10 min-w-0 shrink grow rounded-md border px-3 text-sm focus:outline-none focus:ring-neutral-500",
                        isDeactivated && "text-content-subtle cursor-default",
                      )}
                    />
                  ) : (
                    <div className="h-10 w-16 animate-pulse rounded-md bg-neutral-200 lg:w-72" />
                  )}
                  {isDeactivated
                    ? (() => {
                        const deactivatedBadge =
                          PartnerStatusBadges.deactivated;
                        return (
                          <StatusBadge
                            variant={deactivatedBadge.variant}
                            icon={deactivatedBadge.icon}
                            className="xs:w-fit absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5"
                          >
                            {deactivatedBadge.label}
                          </StatusBadge>
                        );
                      })()
                    : !isDeactivated && (
                        <Button
                          icon={
                            <div className="relative size-4">
                              <div
                                className={cn(
                                  "absolute inset-0 transition-[transform,opacity]",
                                  copied && "translate-y-1 opacity-0",
                                )}
                              >
                                <Copy className="size-4" />
                              </div>
                              <div
                                className={cn(
                                  "absolute inset-0 transition-[transform,opacity]",
                                  !copied && "translate-y-1 opacity-0",
                                )}
                              >
                                <Check className="size-4" />
                              </div>
                            </div>
                          }
                          text={copied ? "Copied link" : "Copy link"}
                          className="xs:w-fit"
                          onClick={() => {
                            if (partnerLink) {
                              copyToClipboard(partnerLink);
                            }
                          }}
                        />
                      )}
                </div>

                {programEnrollment.group?.linkStructure === "query" && (
                  <QueryLinkStructureHelpText link={defaultProgramLink} />
                )}

                {((programEnrollment?.rewards &&
                  programEnrollment?.rewards.length > 0) ||
                  programEnrollment?.discount) && (
                  <>
                    <span className="mt-12 text-base font-semibold text-neutral-800">
                      Rewards
                    </span>
                    <div className="relative mt-2 text-lg text-neutral-900 md:max-w-[50%]">
                      {program && programEnrollment?.rewards ? (
                        <ProgramRewardList
                          rewards={programEnrollment?.rewards}
                          discount={programEnrollment?.discount}
                        />
                      ) : (
                        <div className="h-7 w-5/6 animate-pulse rounded-md bg-neutral-200" />
                      )}
                    </div>
                  </>
                )}
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="group rounded-lg border border-neutral-300 p-5 pb-3 lg:col-span-2">
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
        <div className="mt-6">
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
      <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-6">
          <div>
            <span className="block text-base font-semibold leading-none text-neutral-800">
              Earnings
            </span>
            <div className="mt-1 flex items-center gap-2">
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
        {data ? (
          <BrandedChart data={data} currency />
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load earnings data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
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
    <div className="group block rounded-lg border border-neutral-300 bg-white p-5 pb-3">
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
        {timeseries ? (
          <BrandedChart
            data={timeseries.map((d) => ({
              date: new Date(d.start),
              value: d[event],
            }))}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
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
    <div className="relative block rounded-lg border border-neutral-300 bg-white px-5 py-4">
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

        <XAxis showAxisLine={false} />
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
      <div className="overflow-visible transition-all duration-200 focus-within:w-[82px] focus-within:opacity-100 group-hover:w-[82px] group-hover:opacity-100 sm:w-0 sm:opacity-0">
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
