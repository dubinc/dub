"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  Button,
  buttonVariants,
  MaxWidthWrapper,
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
import { Check, Copy, LoadingSpinner, MoneyBill } from "@dub/ui/icons";
import { cn, currencyFormatter, getPrettyUrl, nFormatter } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { LinearGradient } from "@visx/gradient";
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
  interval: "30d",
});

export default function ProgramPageClient() {
  const { getQueryString, searchParamsObj } = useRouterStuff();
  const { programSlug } = useParams();

  const { programEnrollment } = useProgramEnrollment();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const {
    start,
    end,
    interval = "30d",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const program = programEnrollment?.program;
  const masterLink = programEnrollment?.links?.[0];

  return (
    <MaxWidthWrapper className="pb-10">
      <div className="relative z-0 flex flex-col overflow-hidden rounded-lg border border-neutral-300 p-4 md:p-6">
        {program && (
          <HeroBackground logo={program.logo} color={program.brandColor} />
        )}
        <span className="flex items-center gap-2 text-sm text-neutral-500">
          <MoneyBill className="size-4" />
          Refer and earn
        </span>
        <div className="relative mt-24 text-lg text-neutral-900 sm:max-w-[50%]">
          {program ? (
            <ProgramRewardDescription
              reward={programEnrollment?.reward}
              discount={programEnrollment?.discount}
            />
          ) : (
            <div className="h-7 w-5/6 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
          Referral link
        </span>
        <div className="xs:flex-row relative flex flex-col items-center gap-2">
          {masterLink ? (
            <input
              type="text"
              readOnly
              value={getPrettyUrl(masterLink.shortLink)}
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 lg:min-w-64 xl:min-w-72"
            />
          ) : (
            <div className="h-10 w-16 animate-pulse rounded-md bg-neutral-200 lg:w-72" />
          )}
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
            disabled={!masterLink}
            onClick={() => {
              if (masterLink) {
                copyToClipboard(masterLink.shortLink);
              }
            }}
          />
        </div>
      </div>
      <ProgramOverviewContext.Provider
        value={{
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval,
          color: program?.brandColor ?? undefined,
        }}
      >
        <ChartTooltipSync>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="group rounded-lg border border-neutral-300 p-5 pb-3 lg:col-span-2">
              <EarningsChart />
            </div>

            <PayoutsCard programId={program?.id} />
            <NumberFlowGroup>
              <StatCard title="Clicks" event="clicks" />
              <StatCard title="Leads" event="leads" />
              <StatCard title="Sales" event="sales" />
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
    </MaxWidthWrapper>
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

  const total = useMemo(
    () => timeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [timeseries],
  );

  const data = useMemo(
    () =>
      timeseries?.map(({ start, earnings }) => ({
        date: new Date(start),
        value: earnings / 100,
      })),
    [timeseries],
  );

  return (
    <div>
      <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
        <div>
          <span className="block text-base font-semibold leading-none text-neutral-800">
            Earnings
          </span>
          <div className="mt-1">
            {total !== undefined ? (
              <NumberFlow
                className="text-lg font-medium leading-none text-neutral-600"
                value={total / 100}
                format={{
                  style: "currency",
                  currency: "USD",
                  // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                  trailingZeroDisplay: "stripIfInteger",
                }}
              />
            ) : (
              <div className="h-[27px] w-24 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <ViewMoreButton
            href={`/programs/${programSlug}/earnings${getQueryString()}`}
          />
          <SimpleDateRangePicker
            className="h-7 w-full px-2.5 text-xs font-medium md:w-fit"
            align="end"
            defaultInterval="30d"
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

  const { data: total } = usePartnerAnalytics({
    event: "composite",
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval,
    start,
    end,
    event,
  });

  return (
    <div className="group block rounded-lg border border-neutral-300 bg-white p-5 pb-3">
      <div className="flex justify-between">
        <div>
          <span className="mb-1 block text-base font-semibold leading-none text-neutral-800">
            {title}
          </span>
          {total !== undefined ? (
            <div className="flex items-center gap-1 text-lg font-medium text-neutral-600">
              <NumberFlow
                value={total[event]}
                format={{
                  notation: total[event] > 999999 ? "compact" : "standard",
                }}
              />
            </div>
          ) : (
            <div className="h-[27px] w-16 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <ViewMoreButton
          href={`/programs/${programSlug}/links/analytics?event=${event}${getQueryString()?.replace("?", "&")}`}
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

function BrandedChart({
  data: dataProp,
  currency,
}: {
  data: { date: Date; value: number }[];
  currency?: boolean;
}) {
  const id = useId();

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
                  })}
                </span>
                <p className="text-right text-neutral-500">
                  {currency
                    ? currencyFormatter(d.values.main, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
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
    <div className="-mr-2 pr-2 [mask-image:linear-gradient(270deg,transparent,black_8px)] [mask-origin:padding-box]">
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
