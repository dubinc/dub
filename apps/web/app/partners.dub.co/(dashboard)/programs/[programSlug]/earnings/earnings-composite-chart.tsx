"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import usePartnerEarningsCount from "@/lib/swr/use-partner-earnings-count";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import usePartnerLinks from "@/lib/swr/use-partner-links";
import { LinkIcon } from "@/ui/links/link-icon";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { SaleStatusBadges } from "@/ui/partners/sale-status-badges";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Filter, LoadingSpinner, ToggleGroup, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { CircleDotted, Hyperlink, Sliders, User } from "@dub/ui/icons";
import {
  capitalize,
  cn,
  currencyFormatter,
  getPrettyUrl,
  linkConstructor,
  nFormatter,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, useMemo, useState } from "react";

const LINE_COLORS = [
  "text-teal-500",
  "text-purple-500",
  "text-blue-500",
  "text-green-500",
  "text-orange-500",
  "text-yellow-500",
];

const EVENT_TYPE_LINE_COLORS = {
  sale: "text-teal-500",
  lead: "text-purple-500",
  click: "text-blue-500",
};

const MAX_LINES = LINE_COLORS.length;

export function EarningsCompositeChart() {
  const { queryParams, searchParamsObj } = useRouterStuff();

  const {
    start,
    end,
    interval = DUB_PARTNERS_ANALYTICS_INTERVAL,
    groupBy = "linkId",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
    groupBy?: "linkId" | "type";
  };

  const { links } = usePartnerLinks();

  const { data } = usePartnerEarningsTimeseries({
    interval,
    groupBy,
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
  });

  const total = useMemo(
    () => data?.reduce((acc, { earnings }) => acc + earnings, 0),
    [data],
  );

  const [chartData, series] = useMemo(
    () => [
      data?.map(({ start, earnings, data }) => ({
        date: new Date(start),
        values: { ...data, total: earnings },
      })),
      data
        ? [...new Set<string>(data.flatMap(({ data }) => Object.keys(data)))]
            // Sort by total earnings for the period
            .sort((a, b) => {
              const [earningsA, earningsB] = data.reduce(
                (acc, { data }) => [acc[0] + data[a], acc[1] + data[b]],
                [0, 0],
              );
              return earningsB - earningsA;
            })
            .slice(0, MAX_LINES)
            .map((item, idx) => ({
              id: item,
              isActive: true,
              valueAccessor: (d) => (d.values[item] || 0) / 100,
              colorClassName:
                groupBy === "type"
                  ? EVENT_TYPE_LINE_COLORS[item]
                  : LINE_COLORS[idx % LINE_COLORS.length],
            }))
        : [],
    ],
    [data],
  );

  return (
    <div className="flex flex-col gap-6">
      <EarningsTableControls />
      <div className="rounded-lg border border-neutral-200 p-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Total Earnings</span>
            <div className="mt-1">
              {total !== undefined ? (
                <NumberFlow
                  className="text-lg font-medium leading-none text-neutral-800"
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

          <ToggleGroup
            className="flex w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100"
            optionClassName="h-8 px-2.5 flex items-center justify-center"
            indicatorClassName="border border-neutral-200 bg-white"
            options={[
              {
                label: (
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Hyperlink className="size-4" />
                    <span className="text-sm">Link</span>
                  </div>
                ),
                value: "linkId",
              },
              {
                label: (
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Sliders className="size-4" />
                    <span className="text-sm">Type</span>
                  </div>
                ),
                value: "type",
              },
            ]}
            selected={groupBy}
            selectAction={(option) => {
              queryParams({
                set: { groupBy: option },
                scroll: false,
              });
            }}
          />
        </div>
        <div className="mt-5 h-80">
          {chartData ? (
            <TimeSeriesChart
              data={chartData}
              series={series}
              tooltipClassName="p-0"
              tooltipContent={(d) => {
                return (
                  <>
                    <div className="flex justify-between border-b border-neutral-200 p-3 text-xs">
                      <p className="font-medium leading-none text-neutral-900">
                        {formatDateTooltip(d.date, {
                          interval,
                          start,
                          end,
                        })}
                      </p>
                      <p className="text-right leading-none text-neutral-500">
                        {currencyFormatter((d.values.total || 0) / 100, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="grid max-w-64 grid-cols-[minmax(0,1fr),min-content] gap-x-6 gap-y-2 px-4 py-3 text-xs">
                      {series.map(({ id, colorClassName, valueAccessor }) => {
                        const link = links?.find((link) => link.id === id);
                        return (
                          <Fragment key={id}>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  colorClassName,
                                  "size-2 shrink-0 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                                )}
                              />
                              <span className="min-w-0 truncate font-medium text-neutral-700">
                                {link?.shortLink
                                  ? getPrettyUrl(link.shortLink)
                                  : capitalize(id)}
                              </span>
                            </div>
                            <p className="text-right text-neutral-500">
                              {currencyFormatter(valueAccessor(d), {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </Fragment>
                        );
                      })}
                    </div>
                  </>
                );
              }}
            >
              <Areas />
              <XAxis
                tickFormat={(d) =>
                  formatDateTooltip(d, {
                    interval,
                    start,
                    end,
                  })
                }
              />
              <YAxis
                showGridLines
                tickFormat={(v) => `${currencyFormatter(v)}`}
              />
            </TimeSeriesChart>
          ) : (
            <div className="flex size-full items-center justify-center">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EarningsTableControls() {
  const { queryParams, searchParamsObj } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { earningsCount: links } = usePartnerEarningsCount<
    { id: string; domain: string; key: string; url: string; _count: number }[]
  >({
    groupBy: "linkId",
    enabled:
      selectedFilter === "linkId" || searchParamsObj.linkId ? true : false,
  });

  const { earningsCount: customers } = usePartnerEarningsCount<
    { id: string; email: string; _count: number }[]
  >({
    groupBy: "customerId",
    enabled:
      selectedFilter === "customerId" || searchParamsObj.customerId
        ? true
        : false,
  });

  const { earningsCount: statuses } = usePartnerEarningsCount<
    { status: string; _count: number }[]
  >({
    groupBy: "status",
    enabled:
      selectedFilter === "status" || searchParamsObj.status ? true : false,
  });

  const filters = useMemo(
    () => [
      {
        key: "type",
        icon: Sliders,
        label: "Type",
        options: ["click", "lead", "sale"].map((slug) => ({
          value: slug,
          label: capitalize(slug) as string,
          icon: <CommissionTypeIcon type={slug} />,
        })),
      },
      {
        key: "linkId",
        icon: Hyperlink,
        label: "Link",
        getOptionIcon: (_value, props) => {
          return <LinkIcon url={props.option?.data?.url} />;
        },
        options:
          links?.map(({ id, domain, key, url }) => ({
            value: id,
            label: linkConstructor({
              domain,
              key,
              pretty: true,
            }),
            data: { url },
          })) ?? null,
      },
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        options:
          customers?.map(({ id, email }) => ({
            value: id,
            label: email || id,
          })) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: statuses?.map(({ status, _count }) => {
          const Icon = SaleStatusBadges[status].icon;
          return {
            value: status,
            label: SaleStatusBadges[status].label,
            icon: (
              <Icon
                className={cn(
                  SaleStatusBadges[status].className,
                  "size-4 bg-transparent",
                )}
              />
            ),
            right: nFormatter(_count, { full: true }),
          };
        }),
      },
    ],
    [links, customers, statuses],
  );

  const activeFilters = useMemo(() => {
    const { type, linkId, customerId, status } = searchParamsObj;
    return [
      ...(type ? [{ key: "type", value: type }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
      scroll: false,
    });

  const onRemove = (key: string, _value: any) =>
    queryParams({
      del: [key, "page"],
      scroll: false,
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["linkId", "customerId", "status", "page"],
      scroll: false,
    });

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        <Filter.Select
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          onSelectedFilterChange={setSelectedFilter}
        />
        <SimpleDateRangePicker
          className="w-full sm:min-w-[200px] md:w-fit"
          align="start"
        />
      </div>

      <div
        className={cn(
          "transition-[height] duration-[300ms]",
          activeFilters.length ? "h-3" : "h-0",
        )}
      />
      <Filter.List
        filters={filters}
        activeFilters={activeFilters}
        onRemove={onRemove}
        onRemoveAll={onRemoveAll}
      />
    </div>
  );
}
