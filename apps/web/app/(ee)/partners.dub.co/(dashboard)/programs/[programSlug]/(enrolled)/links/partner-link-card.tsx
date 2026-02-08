import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerProfileLinkProps } from "@/lib/types";
import { CommentsBadge } from "@/ui/links/comments-badge";
import { DiscountCodeBadge } from "@/ui/partners/discounts/discount-code-badge";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import {
  ArrowTurnRight2,
  Button,
  CardList,
  CopyButton,
  CursorRays,
  InvoiceDollar,
  LinkLogo,
  LoadingSpinner,
  StatusBadge,
  Tooltip,
  useInViewport,
  UserCheck,
  useRouterStuff,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis } from "@dub/ui/charts";
import {
  cn,
  currencyFormatter,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import {
  ComponentProps,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { usePartnerLinksContext } from "./page-client";
import { PartnerLinkControls } from "./partner-link-controls";

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

export function PartnerLinkCard({ link }: { link: PartnerProfileLinkProps }) {
  const { programEnrollment } = useProgramEnrollment();
  const { displayOption } = usePartnerLinksContext();

  const partnerLink = constructPartnerLink({
    group: programEnrollment?.group,
    link,
  });

  const isDeactivated = programEnrollment?.status === "deactivated";

  return (
    <CardList.Card
      innerClassName={cn("px-0 py-0 group/card", isDeactivated && "opacity-80")}
    >
      <div className="p-4">
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
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <a
                    href={isDeactivated ? undefined : partnerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "truncate text-sm font-semibold leading-6 transition-colors",
                      isDeactivated
                        ? "cursor-default text-neutral-400"
                        : "text-neutral-700 hover:text-black",
                    )}
                    onClick={
                      isDeactivated ? (e) => e.preventDefault() : undefined
                    }
                  >
                    {getPrettyUrl(partnerLink)}
                  </a>
                  {!isDeactivated && (
                    <CopyButton value={partnerLink} variant="neutral" />
                  )}

                  {link.comments && <CommentsBadge comments={link.comments} />}
                </div>

                {/* The max width implementation here is a bit hacky, we should improve in the future */}
                <div className="flex max-w-[100px] items-center gap-1 py-0 pl-1 pr-1.5 sm:w-fit sm:max-w-[400px]">
                  <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                  <a
                    href={isDeactivated ? undefined : link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-alias truncate text-sm text-neutral-500 decoration-dotted transition-colors hover:text-neutral-700 hover:underline hover:underline-offset-2"
                    title={getPrettyUrl(link.url)}
                    onClick={
                      isDeactivated ? (e) => e.preventDefault() : undefined
                    }
                  >
                    {getPrettyUrl(link.url)}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDeactivated &&
              (() => {
                const deactivatedBadge = PartnerStatusBadges.deactivated;
                return (
                  <StatusBadge
                    variant={deactivatedBadge.variant}
                    icon={deactivatedBadge.icon}
                    className="px-1.5 py-0.5"
                  >
                    {deactivatedBadge.label}
                  </StatusBadge>
                );
              })()}
            {link.discountCode && (
              <Tooltip
                content={
                  "This program supports discount code tracking. Copy the code to use it in podcasts, videos, etc. [Learn more](https://dub.co/help/article/dual-sided-incentives)"
                }
              >
                <div className="hidden items-center gap-1.5 rounded-xl border border-neutral-200 py-1 pl-2 pr-1 sm:flex">
                  <span className="text-sm leading-none text-neutral-500">
                    Discount code
                  </span>
                  <DiscountCodeBadge code={link.discountCode} />
                </div>
              </Tooltip>
            )}
            {displayOption === "cards" && <StatsBadge link={link} />}
            <Controls link={link} />
          </div>
        </div>
      </div>
      {displayOption === "full" && <StatsCharts link={link} />}
    </CardList.Card>
  );
}

const StatsBadge = memo(({ link }: { link: PartnerProfileLinkProps }) => {
  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment();
  const As = showDetailedAnalytics ? Link : "div";
  return (
    <As
      href={`/programs/${programEnrollment?.program.slug}/analytics?domain=${link.domain}&key=${link.key}`}
      className="flex items-center gap-0.5 rounded-md border border-neutral-200 bg-neutral-50 p-0.5 text-sm text-neutral-600"
    >
      {[
        {
          id: "clicks",
          icon: CursorRays,
          value: link.clicks,
          iconClassName: "data-[active=true]:text-blue-500",
        },
        {
          id: "leads",
          icon: UserCheck,
          value: link.leads,
          className: "hidden sm:flex",
          iconClassName: "data-[active=true]:text-purple-500",
        },
        {
          id: "sales",
          icon: InvoiceDollar,
          value: link.saleAmount,
          className: "hidden sm:flex",
          iconClassName: "data-[active=true]:text-teal-500",
        },
      ].map(({ id: tab, icon: Icon, value, className, iconClassName }) => (
        <div
          key={tab}
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded-md px-1 py-px transition-colors",
            className,
          )}
        >
          <Icon
            data-active={value > 0}
            className={cn("h-4 w-4 shrink-0", iconClassName)}
          />
          <span>
            {tab === "sales"
              ? currencyFormatter(value, {
                  trailingZeroDisplay: "stripIfInteger",
                })
              : nFormatter(value)}
          </span>
        </div>
      ))}
    </As>
  );
});

const StatsCharts = memo(({ link }: { link: PartnerProfileLinkProps }) => {
  const { getQueryString } = useRouterStuff();
  const { start, end, interval } = usePartnerLinksContext();
  const { programEnrollment } = useProgramEnrollment();

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
      values: { clicks, leads, saleAmount: saleAmount },
    }));
  }, [timeseries]);

  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-3">
      {CHARTS.map((chart) => (
        <Link
          key={chart.key}
          href={`/programs/${programEnrollment?.program.slug}/analytics${getQueryString(
            {
              domain: link.domain,
              key: link.key,
              event: chart.key === "saleAmount" ? "sales" : chart.key,
            },
          )}`}
          className="group/chart relative isolate rounded-lg border border-neutral-200 px-2 py-1.5 lg:px-3"
        >
          <div className="absolute right-2 top-2 overflow-hidden">
            <div className="translate-x-full transition-transform duration-200 group-hover/chart:translate-x-0">
              <Button
                text="View more"
                variant="secondary"
                className="h-6 w-fit px-2 text-xs"
              />
            </div>
          </div>
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
                    chart.currency ? totals[chart.key] / 100 : totals[chart.key]
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
                            totals[chart.key] > 999999 ? "compact" : "standard",
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
  );
});

const Controls = memo(({ link }: { link: PartnerProfileLinkProps }) => {
  const { hovered } = useContext(CardList.Card.Context);
  const { openMenuLinkId, setOpenMenuLinkId } = usePartnerLinksContext();

  const openPopover = openMenuLinkId === link.id;
  const setOpenPopover = useCallback(
    (open: boolean) => {
      setOpenMenuLinkId(open ? link.id : null);
    },
    [link.id, setOpenMenuLinkId],
  );

  const shortcutsEnabled = openPopover || (hovered && openMenuLinkId === null);

  return (
    <PartnerLinkControls
      link={link}
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      shortcutsEnabled={shortcutsEnabled}
    />
  );
});

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
                      value={series.valueAccessor(d) / 100}
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
