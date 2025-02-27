import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerProfileLinkProps } from "@/lib/types";
import { CommentsBadge } from "@/ui/links/comments-badge";
import { usePartnerLinkModal } from "@/ui/modals/partner-link-modal";
import {
  ArrowTurnRight2,
  BlurImage,
  CardList,
  CopyButton,
  CursorRays,
  InvoiceDollar,
  LinkLogo,
  LoadingSpinner,
  useInViewport,
  UserCheck,
  useRouterStuff,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis } from "@dub/ui/charts";
import {
  cn,
  DICEBEAR_AVATAR_URL,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { ComponentProps, useMemo, useRef } from "react";
import { usePartnerLinksContext } from "./page-client";

const CHARTS = [
  {
    key: "clicks",
    icon: CursorRays,
    label: "Clicks",
    colorClassName: "text-blue-500",
  },
  {
    key: "leads",
    icon: UserCheck,
    label: "Leads",
    colorClassName: "text-purple-500",
  },
  {
    key: "saleAmount",
    icon: InvoiceDollar,
    label: "Sales",
    colorClassName: "text-teal-500",
    currency: true,
  },
];

export function PartnerLinkCard({
  link,
  isDefaultLink,
}: {
  link: PartnerProfileLinkProps;
  isDefaultLink?: boolean;
}) {
  const { getQueryString } = useRouterStuff();
  const { start, end, interval } = usePartnerLinksContext();
  const { programEnrollment } = useProgramEnrollment();
  const { setShowPartnerLinkModal, PartnerLinkModal } = usePartnerLinkModal({
    link,
    isDefaultLink,
  });

  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useInViewport(ref);
  const lastValidTotals = useRef<{
    clicks: number;
    leads: number;
    saleAmount: number;
  } | null>(null);

  const { data: timeseries, error } = usePartnerAnalytics(
    {
      linkId: link.id,
      groupBy: "timeseries",
      event: "composite",
      interval,
      start,
      end,
      enabled: isVisible,
    },
    {
      keepPreviousData: false,
    },
  );

  const totals = useMemo(() => {
    const newTotals = timeseries?.reduce(
      (acc, { clicks, leads, saleAmount }) => ({
        clicks: acc.clicks + clicks,
        leads: acc.leads + leads,
        saleAmount: acc.saleAmount + saleAmount,
      }),
      { clicks: 0, leads: 0, saleAmount: 0 },
    );

    if (newTotals) {
      lastValidTotals.current = newTotals;
      return newTotals;
    }

    return lastValidTotals.current ?? { clicks: 0, leads: 0, saleAmount: 0 };
  }, [timeseries]);

  const chartData = useMemo(() => {
    return timeseries?.map(({ start, clicks, leads, saleAmount }) => ({
      date: new Date(start),
      values: { clicks, leads, saleAmount: saleAmount / 100 },
    }));
  }, [timeseries]);

  const stats = useMemo(
    () => [
      {
        id: "clicks",
        icon: CursorRays,
        value: totals?.clicks ?? 0,
        iconClassName: "data-[active=true]:text-blue-500",
      },
      {
        id: "leads",
        icon: UserCheck,
        value: totals?.leads ?? 0,
        className: "hidden sm:flex",
        iconClassName: "data-[active=true]:text-purple-500",
      },
      {
        id: "sales",
        icon: InvoiceDollar,
        value: totals?.saleAmount ?? 0,
        className: "hidden sm:flex",
        iconClassName: "data-[active=true]:text-teal-500",
      },
    ],
    [totals],
  );

  return (
    <CardList.Card
      innerClassName="px-0 py-0 hover:cursor-pointer"
      onClick={() => setShowPartnerLinkModal(true)}
    >
      <PartnerLinkModal />
      {isDefaultLink && (
        <div className="flex items-center justify-between gap-4 rounded-t-[11px] border-b border-neutral-200 bg-neutral-100 px-5 py-2">
          <div className="flex items-center gap-1.5">
            {programEnrollment && (
              <BlurImage
                src={
                  programEnrollment.program.logo ||
                  `${DICEBEAR_AVATAR_URL}${programEnrollment.program.name}`
                }
                width={16}
                height={16}
                alt={programEnrollment?.program.name}
                className="size-4 shrink-0 overflow-hidden rounded-full"
              />
            )}
            <span className="text-xs font-medium text-neutral-700">
              Default program link
            </span>
          </div>
          <a
            href="https://dub.co/help/category/partners" // TODO: Update link
            target="_blank"
            className="text-xs font-medium text-neutral-600 underline hover:text-neutral-800"
          >
            Learn more
          </a>
        </div>
      )}
      <div className="p-4" ref={ref}>
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
                {link.comments && <CommentsBadge comments={link.comments} />}
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
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CHARTS.map((chart) => (
            <Link
              key={chart.key}
              href={`/programs/${programEnrollment?.program.slug}/links/analytics${getQueryString(
                {
                  domain: link.domain,
                  key: link.key,
                  event: chart.key === "saleAmount" ? "sales" : chart.key,
                },
              )}`}
              className="rounded-lg border border-neutral-200 px-2 py-1.5 lg:px-3"
            >
              <div className="flex flex-col gap-1 pl-2 pt-3 lg:pl-1.5">
                <div className="flex items-center gap-1.5">
                  <chart.icon
                    className={cn("h-4 w-4 shrink-0", chart.colorClassName)}
                  />
                  <span className="text-sm font-semibold leading-none text-neutral-800">
                    {chart.label}
                  </span>
                </div>
                {totals ? (
                  <span className="text-base font-medium leading-none text-neutral-600">
                    <NumberFlow
                      value={
                        chart.currency
                          ? totals[chart.key] / 100
                          : totals[chart.key]
                      }
                      format={
                        chart.currency
                          ? {
                              style: "currency",
                              currency: "USD",
                              // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                              trailingZeroDisplay: "stripIfInteger",
                            }
                          : {
                              notation:
                                totals[chart.key] > 999999
                                  ? "compact"
                                  : "standard",
                            }
                      }
                    />
                  </span>
                ) : (
                  <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
                )}
              </div>
              <div className="h-20 sm:h-24">
                {chartData ? (
                  <LinkEventsChart
                    key={`${interval}-${start}-${end}`}
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
                    {error ? (
                      <p className="text-xs text-neutral-500">
                        Failed to load data
                      </p>
                    ) : (
                      <LoadingSpinner className="size-4" />
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
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
              <div className="flex items-center justify-between gap-6 whitespace-nowrap p-2 text-xs leading-none">
                <span className="font-medium text-neutral-700">
                  {formatDateTooltip(d.date, {
                    interval,
                    start,
                    end,
                  })}
                </span>
                <p className="text-right text-neutral-500">
                  {currency ? (
                    <NumberFlow
                      value={series.valueAccessor(d)}
                      format={{ style: "currency", currency: "USD" }}
                    />
                  ) : (
                    <NumberFlow value={series.valueAccessor(d)} />
                  )}
                </p>
              </div>
            </>
          );
        }}
      >
        <XAxis showAxisLine={false} highlightLast={false} maxTicks={2} />
        <Areas showLatestValueCircle={false} />
      </TimeSeriesChart>
    </div>
  );
}
