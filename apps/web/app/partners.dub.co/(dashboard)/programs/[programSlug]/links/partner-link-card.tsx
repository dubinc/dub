import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { PartnerLinkProps } from "@/lib/types";
import {
  ArrowTurnRight2,
  CardList,
  CopyButton,
  CursorRays,
  LinkLogo,
  LoadingSpinner,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis } from "@dub/ui/charts";
import {
  currencyFormatter,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import Link from "next/link";
import { ComponentProps, useMemo } from "react";
import { usePartnerLinksContext } from "./page-client";

const CHARTS = [
  {
    key: "clicks",
    label: "Clicks",
    colorClassName: "text-blue-500",
  },
  {
    key: "leads",
    label: "Leads",
    colorClassName: "text-purple-500",
  },
  {
    key: "saleAmount",
    label: "Sales",
    colorClassName: "text-teal-500",
    currency: true,
  },
];

export function PartnerLinkCard({ link }: { link: PartnerLinkProps }) {
  const { start, end, interval } = usePartnerLinksContext();

  const { data: totals } = usePartnerAnalytics({
    linkId: link.id,
    event: "composite",
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = usePartnerAnalytics({
    linkId: link.id,
    groupBy: "timeseries",
    event: "composite",
    interval,
    start,
    end,
  });

  const chartData = useMemo(() => {
    return timeseries?.map(({ start, clicks, leads, saleAmount }) => ({
      date: new Date(start),
      values: { clicks, leads, saleAmount: saleAmount / 100 },
    }));
  }, [timeseries]);

  return (
    <CardList.Card innerClassName="py-4" hoverStateEnabled={false}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative hidden shrink-0 items-center justify-center sm:flex">
            <div className="absolute inset-0 shrink-0 rounded-full border border-neutral-200">
              <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
            </div>
            <div className="relative p-2.5">
              <LinkLogo
                apexDomain={getApexDomain(link.url)}
                className="size-4 sm:size-6"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <a
                href={link.shortLink}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-semibold leading-6 text-neutral-700 transition-colors hover:text-black"
              >
                {getPrettyUrl(link.shortLink)}
              </a>
              <CopyButton
                value={link.shortLink}
                variant="neutral"
                className="p-1.5"
              />
            </div>
            <div className="flex items-center gap-1">
              <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-neutral-500 transition-colors hover:text-neutral-700"
              >
                {getPrettyUrl(link.url)}
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="#"
            className="flex items-center gap-1 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-sm text-neutral-600 transition-colors hover:bg-white"
          >
            <CursorRays className="h-4 w-4 text-neutral-600" />
            <span>{nFormatter(link.clicks)}</span>
          </Link>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
        {CHARTS.map((chart) => (
          <div
            key={chart.key}
            className="rounded-lg border border-neutral-200 px-2 py-1.5 lg:px-3"
          >
            <div className="flex flex-col gap-1 pl-2 pt-3 lg:pl-1.5">
              <span className="text-sm font-semibold leading-none text-neutral-800">
                {chart.label}
              </span>
              {totals ? (
                <span className="text-base font-medium leading-none text-neutral-600">
                  {chart.currency
                    ? currencyFormatter(totals[chart.key] / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : nFormatter(totals[chart.key])}
                </span>
              ) : (
                <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
              )}
            </div>
            <div className="h-18 sm:h-24">
              {chartData ? (
                <LinkEventsChart
                  data={chartData}
                  series={{
                    id: chart.key,
                    valueAccessor: (d) => d.values[chart.key],
                    colorClassName: chart.colorClassName,
                    isActive: true,
                  }}
                  currency={chart.currency}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <LoadingSpinner className="size-4" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardList.Card>
  );
}

function LinkEventsChart({
  data,
  series,
  currency,
}: {
  data: ComponentProps<typeof TimeSeriesChart>["data"];
  series: ComponentProps<typeof TimeSeriesChart>["series"][number];
  currency?: boolean;
}) {
  const { start, end, interval } = usePartnerLinksContext();

  return (
    <div className="relative size-full">
      <TimeSeriesChart
        data={data}
        series={[series]}
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
                    ? currencyFormatter(series.valueAccessor(d), {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : nFormatter(series.valueAccessor(d))}
                </p>
              </div>
            </>
          );
        }}
      >
        <XAxis showAxisLine={false} highlightLast={false} />
        <Areas showLatestValueCircle={false} />
      </TimeSeriesChart>
    </div>
  );
}
