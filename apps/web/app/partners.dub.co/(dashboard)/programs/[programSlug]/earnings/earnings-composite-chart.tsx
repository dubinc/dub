"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { CustomerProps, LinkProps } from "@/lib/types";
import { LinkIcon } from "@/ui/links/link-icon";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Filter, LoadingSpinner, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { Hyperlink, Sliders, User } from "@dub/ui/icons";
import {
  capitalize,
  cn,
  currencyFormatter,
  getPrettyUrl,
  linkConstructor,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, useMemo } from "react";

const LINE_COLORS = [
  "text-teal-500",
  "text-purple-500",
  "text-blue-500",
  "text-green-500",
  "text-orange-500",
  "text-yellow-500",
];

const MAX_LINES = LINE_COLORS.length;

export function EarningsCompositeChart() {
  const { searchParamsObj } = useRouterStuff();

  const {
    start,
    end,
    interval = "1y",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const { data } = usePartnerEarningsTimeseries({
    interval,
    groupBy: "linkId",
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
  });

  const total = useMemo(
    () => data?.timeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [data],
  );

  const [chartData, series] = useMemo(
    () => [
      data?.timeseries?.map(({ start, earnings, data }) => ({
        date: new Date(start),
        values: { ...data, total: earnings },
      })),
      data?.timeseries
        ? [
            ...new Set<string>(
              data.timeseries.flatMap(({ data }) => Object.keys(data)),
            ),
          ]
            // Sort by total earnings for the period
            .sort((a, b) => {
              const [earningsA, earningsB] = data.timeseries.reduce(
                (acc, { data }) => [acc[0] + data[a], acc[1] + data[b]],
                [0, 0],
              );
              return earningsB - earningsA;
            })
            .slice(0, MAX_LINES)
            .map((linkId, idx) => ({
              id: linkId,
              isActive: true,
              valueAccessor: (d) => (d.values[linkId] || 0) / 100,
              colorClassName: LINE_COLORS[idx % LINE_COLORS.length],
            }))
        : [],
    ],
    [data],
  );

  return (
    <div className="flex flex-col gap-6">
      <EarningsTableControls />
      <div className="rounded-lg border border-neutral-200 p-6">
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
                        const link = data?.links?.find((l) => l.id === id);
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
                                  : "Short link"}
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

  // TODO: Fetch links and customers
  const links = [] as LinkProps[];
  const customers = [] as CustomerProps[];

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
        getOptionIcon: (value, props) => {
          const url = props.option?.data?.url;
          const [domain, key] = value.split("/");

          return <LinkIcon url={url} domain={domain} linkKey={key} />;
        },
        options:
          links?.map(({ id, domain, key }) => ({
            value: id,
            label: linkConstructor({ domain, key, pretty: true }),
          })) ?? null,
      },
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        options:
          customers?.map(({ id, name, email }) => ({
            value: id,
            label: name || email || "-",
          })) ?? null,
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { type, linkId, customerId } = searchParamsObj;
    return [
      ...(type ? [{ key: "type", value: type }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string, value: any) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["type", "linkId", "customerId"],
    });

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        {/* <Filter.Select
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          // onSearchChange={setSearch}
          // onSelectedFilterChange={setSelectedFilter}
          // emptyState={{
          //   domain: (
          //     <div className="flex flex-col items-center gap-2 p-2 text-center text-sm">
          //       <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          //         <Globe className="size-6 text-neutral-700" />
          //       </div>
          //       <p className="mt-2 font-medium text-neutral-950">
          //         No domains found
          //       </p>
          //       <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">
          //         Add a custom domain to match your brand
          //       </p>
          //       <div>
          //         <Button
          //           className="mt-1 h-8"
          //           onClick={() => router.push(`/${slug}/settings/domains`)}
          //           text="Add domain"
          //         />
          //       </div>
          //     </div>
          //   ),
          // }}
        /> */}
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
