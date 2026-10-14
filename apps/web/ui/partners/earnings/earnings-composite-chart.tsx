"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import {
  usePartnerProfileEarningsCount,
  usePartnerProfileEarningsTimeseries,
} from "@/lib/swr/use-partner-profile-earnings";
import { LinkIcon } from "@/ui/links/link-icon";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { ProgramLogo } from "@/ui/partners/program-logo";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Filter, LoadingSpinner, ToggleGroup, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import {
  CircleDotted,
  GridIcon,
  Hyperlink,
  MoneyBill2,
  Sliders,
  User,
} from "@dub/ui/icons";
import {
  capitalize,
  cn,
  currencyFormatter,
  linkConstructor,
  nFormatter,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { CommissionType } from "@prisma/client";
import { useParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { usePartnerEarningsFilters } from "./use-partner-earnings-filters";

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
  referral: "text-orange-500",
  custom: "text-gray-500",
};

const MAX_LINES = LINE_COLORS.length;

type EarningsGroupBy = "type" | "linkId" | "programId";

// a row of GET /api/partner-profile/earnings/count, grouped by link or by program
type EarningsCountGroup = {
  id: string;
  domain?: string;
  key?: string;
  name?: string;
  logo?: string | null;
};

// the program name, the short link, or the commission type of a chart line
function getGroupLabel({
  groupBy,
  group,
  id,
}: {
  groupBy?: EarningsGroupBy;
  group?: EarningsCountGroup;
  id: string;
}) {
  if (groupBy === "programId" && group?.name) {
    return group.name;
  }

  if (groupBy === "linkId" && group?.domain && group?.key) {
    return linkConstructor({
      domain: group.domain,
      key: group.key,
      pretty: true,
    });
  }

  return capitalize(id);
}

export function EarningsCompositeChart() {
  const { programSlug } = useParams<{ programSlug?: string }>();
  const { queryParams, searchParamsObj } = useRouterStuff();

  const filters = usePartnerEarningsFilters();
  const { start, end, interval } = filters;

  // no grouping by default, so the chart shows one line with the total. Only
  // the All programs page (no programSlug) can group by program.
  const groupByOptions: EarningsGroupBy[] = programSlug
    ? ["type", "linkId"]
    : ["type", "linkId", "programId"];
  const groupBy = groupByOptions.find(
    (option) => option === searchParamsObj.groupBy,
  );
  const labelsGroupBy =
    groupBy === "linkId" || groupBy === "programId" ? groupBy : undefined;

  const { data } = usePartnerProfileEarningsTimeseries({
    ...filters,
    groupBy,
  });

  // the names of the links and programs in the tooltip
  const { data: groups } = usePartnerProfileEarningsCount<EarningsCountGroup[]>(
    {
      ...filters,
      groupBy: labelsGroupBy,
      enabled: !!labelsGroupBy,
    },
  );

  const groupsById = useMemo(
    () => new Map(groups?.map((group) => [group.id, group])),
    [groups],
  );

  const total = useMemo(
    () => data?.reduce((acc, { earnings }) => acc + earnings, 0),
    [data],
  );

  const [chartData, series] = useMemo(
    () => [
      data?.map(({ start, earnings, data: breakdown }) => ({
        date: new Date(start),
        values: { ...(breakdown ?? {}), total: earnings },
      })),
      data
        ? (() => {
            const keys = new Set<string>(
              data.flatMap(({ data: breakdown }) =>
                Object.keys(breakdown ?? {}),
              ),
            );
            const sortedKeys: string[] =
              keys.size > 0
                ? [...keys].sort((a: string, b: string) => {
                    const [earningsA, earningsB] = data.reduce(
                      (acc, { data: breakdown }) => [
                        acc[0] + (breakdown?.[a] ?? 0),
                        acc[1] + (breakdown?.[b] ?? 0),
                      ],
                      [0, 0],
                    );
                    return earningsB - earningsA;
                  })
                : ["total"];
            return sortedKeys.slice(0, MAX_LINES).map((item, idx) => ({
              id: item,
              isActive: true,
              valueAccessor: (d) => d.values[item] || 0,
              colorClassName:
                groupBy === "type"
                  ? EVENT_TYPE_LINE_COLORS[
                      item as keyof typeof EVENT_TYPE_LINE_COLORS
                    ] ?? LINE_COLORS[idx % LINE_COLORS.length]
                  : LINE_COLORS[idx % LINE_COLORS.length],
            }));
          })()
        : [],
    ],
    [data, groupBy],
  );

  return (
    <div className="flex flex-col gap-4">
      <EarningsTableControls />
      <div className="rounded-lg border border-neutral-200 p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
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
                    <Sliders className="size-4" />
                    <span className="text-sm">Type</span>
                  </div>
                ),
                value: "type",
              },
              {
                label: (
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Hyperlink className="size-4" />
                    <span className="text-sm">Link</span>
                  </div>
                ),
                value: "linkId",
              },
              ...(programSlug
                ? []
                : [
                    {
                      label: (
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <GridIcon className="size-4" />
                          <span className="text-sm">Program</span>
                        </div>
                      ),
                      value: "programId",
                    },
                  ]),
            ]}
            selected={groupBy ?? null}
            // a click on the selected option goes back to the total
            selectAction={(option) =>
              queryParams(
                option === groupBy
                  ? { del: "groupBy" }
                  : { set: { groupBy: option } },
              )
            }
          />
        </div>
        <div className="mt-5 h-80">
          {chartData && chartData.length > 0 ? (
            <TimeSeriesChart
              data={chartData}
              series={series}
              tooltipClassName="p-0"
              tooltipContent={(d) => {
                return (
                  <>
                    <div
                      className={cn(
                        "flex justify-between gap-6 p-3 text-xs",
                        groupBy && "border-b border-neutral-200",
                      )}
                    >
                      <p className="font-medium leading-none text-neutral-900">
                        {formatDateTooltip(d.date, {
                          interval,
                          start,
                          end,
                        })}
                      </p>
                      <p className="text-right leading-none text-neutral-500">
                        {currencyFormatter(d.values.total || 0)}
                      </p>
                    </div>
                    {groupBy && (
                      <div className="grid max-w-64 grid-cols-[minmax(0,1fr),min-content] gap-x-6 gap-y-2 px-4 py-3 text-xs">
                        {series.map(({ id, colorClassName, valueAccessor }) => {
                          const group = groupsById.get(id);
                          return (
                            <Fragment key={id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    colorClassName,
                                    "size-2 shrink-0 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                                  )}
                                />
                                {groupBy === "programId" && group?.name && (
                                  <ProgramLogo
                                    program={{
                                      name: group.name,
                                      logo: group.logo ?? null,
                                    }}
                                    className="size-3.5"
                                  />
                                )}
                                <span className="min-w-0 truncate font-medium text-neutral-700">
                                  {getGroupLabel({ groupBy, group, id })}
                                </span>
                              </div>
                              <p className="text-right text-neutral-500">
                                {currencyFormatter(valueAccessor(d))}
                              </p>
                            </Fragment>
                          );
                        })}
                      </div>
                    )}
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
  const { programSlug } = useParams<{ programSlug?: string }>();
  const { queryParams, searchParamsObj } = useRouterStuff();
  const earningsFilters = usePartnerEarningsFilters();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: programs } = usePartnerProfileEarningsCount<
    { id: string; name?: string; logo?: string | null; _count: number }[]
  >({
    ...earningsFilters,
    // the menu lists every program, also when one program is selected
    programIdOrSlug: undefined,
    groupBy: "programId",
    enabled:
      !programSlug &&
      (selectedFilter === "programId" || searchParamsObj.programId
        ? true
        : false),
  });

  const { data: links } = usePartnerProfileEarningsCount<
    { id: string; domain: string; key: string; url: string; _count: number }[]
  >({
    ...earningsFilters,
    groupBy: "linkId",
    enabled:
      selectedFilter === "linkId" || searchParamsObj.linkId ? true : false,
  });

  const { data: customers } = usePartnerProfileEarningsCount<
    { id: string; email: string; _count: number }[]
  >({
    ...earningsFilters,
    groupBy: "customerId",
    enabled:
      selectedFilter === "customerId" || searchParamsObj.customerId
        ? true
        : false,
  });

  const { data: statuses } = usePartnerProfileEarningsCount<
    { status: string; _count: number }[]
  >({
    ...earningsFilters,
    groupBy: "status",
    enabled:
      selectedFilter === "status" || searchParamsObj.status ? true : false,
  });

  const filters = useMemo(
    () => [
      ...(programSlug
        ? []
        : [
            {
              key: "programId",
              icon: GridIcon,
              label: "Program",
              options:
                programs?.map(({ id, name, logo, _count }) => ({
                  value: id,
                  label: name ?? id,
                  icon: (
                    <ProgramLogo
                      program={{ name: name ?? id, logo: logo ?? null }}
                      className="size-4"
                    />
                  ),
                  right: nFormatter(_count, { full: true }),
                })) ?? null,
            },
          ]),
      {
        key: "type",
        icon: Sliders,
        label: "Type",
        options: Object.values(CommissionType).map((type) => ({
          value: type,
          label: capitalize(type) as string,
          icon: <CommissionTypeIcon type={type} />,
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
        options:
          statuses?.map(({ status, _count }) => {
            const Icon = CommissionStatusBadges[status].icon;
            return {
              value: status,
              label: CommissionStatusBadges[status].label,
              icon: (
                <Icon
                  className={cn(
                    CommissionStatusBadges[status].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: nFormatter(_count, { full: true }),
            };
          }) ?? null,
      },
    ],
    [programSlug, programs, links, customers, statuses],
  );

  const activeFilters = useMemo(() => {
    const { programId, type, linkId, customerId, status, payoutId } =
      searchParamsObj;
    return [
      ...(programId && !programSlug
        ? [{ key: "programId", value: programId }]
        : []),
      ...(type ? [{ key: "type", value: type }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
      ...(payoutId ? [{ key: "payoutId", value: payoutId }] : []),
    ];
  }, [searchParamsObj, programSlug]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string, _value: any) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: [
        "programId",
        "type",
        "linkId",
        "customerId",
        "status",
        "payoutId",
        "page",
      ],
    });

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Filter.Select
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          onSelectedFilterChange={setSelectedFilter}
        />
        <SimpleDateRangePicker className="w-full md:w-fit" align="start" />
      </div>

      <div
        className={cn(
          "transition-[height] duration-[300ms]",
          activeFilters.length ? "h-3" : "h-0",
        )}
      />
      <Filter.List
        filters={[
          ...filters,
          {
            key: "payoutId",
            icon: MoneyBill2,
            label: "Payout",
            options: [],
          },
        ]}
        activeFilters={activeFilters}
        onSelect={onSelect}
        onRemove={onRemove}
        onRemoveAll={onRemoveAll}
      />
    </div>
  );
}
