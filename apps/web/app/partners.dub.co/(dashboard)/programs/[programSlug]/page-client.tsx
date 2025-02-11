"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  Button,
  buttonVariants,
  MaxWidthWrapper,
  MiniAreaChart,
  useCopyToClipboard,
  useRouterStuff,
} from "@dub/ui";
import { Areas, ChartContext, TimeSeriesChart, XAxis } from "@dub/ui/charts";
import { Check, Copy, LoadingSpinner, MoneyBill } from "@dub/ui/icons";
import { cn, currencyFormatter, getPrettyUrl } from "@dub/utils";
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
import { SaleTablePartner } from "./sales/sale-table";

const ProgramOverviewContext = createContext<{
  start?: Date;
  end?: Date;
  interval?: IntervalOptions;
  color?: string;
}>({});

export default function ProgramPageClient() {
  const { getQueryString, searchParamsObj } = useRouterStuff();
  const { programSlug } = useParams();

  const { programEnrollment } = useProgramEnrollment();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const {
    start,
    end,
    interval = "1y",
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
            <ProgramCommissionDescription
              program={program}
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
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-64 xl:min-w-72"
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
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-neutral-300 p-5 pb-3 lg:col-span-2">
            <EarningsChart />
          </div>
          <div>{/* Payouts */}</div>
          <NumberFlowGroup>
            <StatCard title="Clicks" event="clicks" />
            <StatCard title="Leads" event="leads" />
            <StatCard title="Sales" event="sales" />
          </NumberFlowGroup>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Recent earnings
            </h2>
            <Link
              href={`/programs/${programSlug}/sales${getQueryString()}`}
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
          <SaleTablePartner limit={10} />
        </div>
      </ProgramOverviewContext.Provider>
    </MaxWidthWrapper>
  );
}

function EarningsChart() {
  const id = useId();

  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: { earnings: total } = {} } = usePartnerAnalytics({
    event: "composite",
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = usePartnerAnalytics({
    event: "sales",
    groupBy: "timeseries",
    interval,
    start,
    end,
  });

  const data = useMemo(
    () =>
      timeseries?.map(({ start, earnings }) => ({
        date: new Date(start),
        values: { earnings: earnings / 100 },
      })),
    [timeseries],
  );

  return (
    <div>
      <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
        <div>
          <span className="block text-base font-semibold text-neutral-800">
            Earnings
          </span>
          <div className="mt-1.5">
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
        <div className="w-full md:w-auto">
          <SimpleDateRangePicker className="h-8 w-full md:w-fit" align="end" />
        </div>
      </div>
      <div
        className="relative mt-4 h-32 w-full"
        style={{ "--color": color || "#DA2778" } as CSSProperties}
      >
        {data ? (
          <TimeSeriesChart
            data={data}
            series={[
              {
                id: "earnings",
                valueAccessor: (d) => d.values.earnings,
                colorClassName: "text-[var(--color)]",
                isActive: true,
              },
            ]}
            tooltipClassName="p-0"
            tooltipContent={(d) => {
              return (
                <>
                  <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                    {formatDateTooltip(d.date, {
                      interval,
                      start,
                      end,
                    })}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-sm shadow-[inset_0_0_0_1px_#0003]",
                          "bg-[var(--color)]",
                        )}
                      />
                      <p className="capitalize text-gray-600">Earnings</p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {currencyFormatter(d.values.earnings, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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

            <XAxis />
            <Areas
              seriesStyles={[
                {
                  id: "earnings",
                  areaFill: `url(#${id}-color-gradient)`,
                  lineStroke: `url(#${id}-color-gradient)`,
                  lineClassName: "text-[var(--color)]",
                },
              ]}
            />
          </TimeSeriesChart>
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
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

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
    <Link
      href={`/programs/${programSlug}/analytics?event=${event}${getQueryString()?.replace("?", "&")}`}
      className="hover:drop-shadow-card-hover block rounded-md border border-neutral-300 bg-white p-5 pb-3 transition-[filter]"
    >
      <span className="block text-base font-semibold text-neutral-800">
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
      <div className="mt-2 h-16 w-full">
        {timeseries ? (
          <MiniAreaChart
            data={timeseries.map((d) => ({
              date: new Date(d.start),
              value: d[event],
            }))}
            curve={false}
            color={color}
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
    </Link>
  );
}
