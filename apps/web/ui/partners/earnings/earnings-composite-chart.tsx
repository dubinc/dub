"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { usePartnerLinksDisplay } from "@/lib/swr/use-partner-links-display";
import {
  usePartnerProfileEarningsCount,
  usePartnerProfileEarningsTimeseries,
} from "@/lib/swr/use-partner-profile-earnings";
import { LinkIcon } from "@/ui/links/link-icon";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { ProgramLogo } from "@/ui/partners/program-logo";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  Filter,
  type Icon,
  LoadingSpinner,
  ToggleGroup,
  useRouterStuff,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import {
  CircleDotted,
  GridIcon,
  Hyperlink,
  MoneyBill2,
  Sliders,
  User,
} from "@dub/ui/icons";
import { capitalize, cn, currencyFormatter, linkConstructor } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { CommissionStatus, CommissionType } from "@prisma/client";
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

// the chart groupings. Only the All programs page (no programSlug) groups by program.
const GROUP_BY_OPTIONS: {
  value: EarningsGroupBy;
  label: string;
  icon: Icon;
  allProgramsOnly?: boolean;
}[] = [
  { value: "type", label: "Type", icon: Sliders },
  { value: "linkId", label: "Link", icon: Hyperlink },
  {
    value: "programId",
    label: "Program",
    icon: GridIcon,
    allProgramsOnly: true,
  },
];

// a row of GET /api/partner-profile/earnings/count, grouped by link or by program
type EarningsCountGroup = {
  id: string;
  domain?: string;
  key?: string;
  partnerLinkTitle?: string | null;
  name?: string;
  logo?: string | null;
};

// the program name, the short link, or the commission type of a chart line
function getGroupLabel({
  groupBy,
  group,
  id,
  showTitle,
}: {
  groupBy: EarningsGroupBy;
  group?: EarningsCountGroup;
  id: string;
  showTitle: boolean;
}) {
  if (groupBy === "programId" && group?.name) {
    return group.name;
  }

  if (groupBy === "linkId" && showTitle && group?.partnerLinkTitle) {
    return group.partnerLinkTitle;
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

  // no grouping by default, so the chart shows one line with the total
  const groupByOptions = GROUP_BY_OPTIONS.filter(
    ({ allProgramsOnly }) => !programSlug || !allProgramsOnly,
  );
  const groupBy = groupByOptions.find(
    ({ value }) => value === searchParamsObj.groupBy,
  )?.value;
  const labelsGroupBy =
    groupBy === "linkId" || groupBy === "programId" ? groupBy : undefined;

  const { displayProperties } = usePartnerLinksDisplay();

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
            options={groupByOptions.map(({ value, label, icon: Icon }) => ({
              value,
              label: (
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <Icon className="size-4" />
                  <span className="text-sm">{label}</span>
                </div>
              ),
            }))}
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
                // the groups without a line, so that the rows add up to the total
                const otherEarnings =
                  (d.values.total || 0) -
                  series.reduce(
                    (acc, { valueAccessor }) => acc + valueAccessor(d),
                    0,
                  );

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
                                  {getGroupLabel({
                                    groupBy,
                                    group,
                                    id,
                                    showTitle:
                                      displayProperties.includes("title"),
                                  })}
                                </span>
                              </div>
                              <p className="text-right text-neutral-500">
                                {currencyFormatter(valueAccessor(d))}
                              </p>
                            </Fragment>
                          );
                        })}
                        {otherEarnings !== 0 && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="size-2 shrink-0 rounded-sm bg-neutral-300 shadow-[inset_0_0_0_1px_#0003]" />
                              <span className="min-w-0 truncate font-medium text-neutral-700">
                                Other
                              </span>
                            </div>
                            <p className="text-right text-neutral-500">
                              {currencyFormatter(otherEarnings)}
                            </p>
                          </>
                        )}
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
  const { displayProperties } = usePartnerLinksDisplay();

  const { data: programs } = usePartnerProfileEarningsCount<
    { id: string; name?: string; logo?: string | null; earnings: number }[]
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

  const { data: types } = usePartnerProfileEarningsCount<
    { type: CommissionType; earnings: number }[]
  >({
    ...earningsFilters,
    groupBy: "type",
    enabled: selectedFilter === "type" || searchParamsObj.type ? true : false,
  });

  const { data: links } = usePartnerProfileEarningsCount<
    {
      id: string;
      domain: string;
      key: string;
      url: string;
      partnerLinkTitle?: string | null;
      earnings: number;
    }[]
  >({
    ...earningsFilters,
    groupBy: "linkId",
    enabled:
      selectedFilter === "linkId" || searchParamsObj.linkId ? true : false,
  });

  const { data: customers } = usePartnerProfileEarningsCount<
    { id: string; email: string; earnings: number }[]
  >({
    ...earningsFilters,
    groupBy: "customerId",
    enabled:
      !!programSlug &&
      (selectedFilter === "customerId" || searchParamsObj.customerId
        ? true
        : false),
  });

  const { data: statuses } = usePartnerProfileEarningsCount<
    { status: CommissionStatus; earnings: number }[]
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
                programs?.map(({ id, name, logo, earnings }) => ({
                  value: id,
                  label: name ?? id,
                  icon: (
                    <ProgramLogo
                      program={{ name: name ?? id, logo: logo ?? null }}
                      className="size-4"
                    />
                  ),
                  right: currencyFormatter(earnings),
                })) ?? null,
            },
          ]),
      {
        key: "type",
        icon: Sliders,
        label: "Type",
        options:
          types?.map(({ type, earnings }) => ({
            value: type,
            label: capitalize(type) as string,
            icon: <CommissionTypeIcon type={type} />,
            right: currencyFormatter(earnings),
          })) ?? null,
      },
      {
        key: "linkId",
        icon: Hyperlink,
        label: "Link",
        getOptionIcon: (_value, props) => {
          return <LinkIcon url={props.option?.data?.url} />;
        },
        options:
          links?.map(
            ({ id, domain, key, url, partnerLinkTitle, earnings }) => ({
              value: id,
              label:
                displayProperties.includes("title") && partnerLinkTitle
                  ? partnerLinkTitle
                  : linkConstructor({
                      domain,
                      key,
                      pretty: true,
                    }),
              data: { url },
              right: currencyFormatter(earnings),
            }),
          ) ?? null,
      },
      // the Customer filter is only on the Earnings page of one program
      ...(programSlug
        ? [
            {
              key: "customerId",
              icon: User,
              label: "Customer",
              options:
                customers?.map(({ id, email, earnings }) => ({
                  value: id,
                  label: email || id,
                  right: currencyFormatter(earnings),
                })) ?? null,
            },
          ]
        : []),
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statuses?.map(({ status, earnings }) => {
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
              right: currencyFormatter(earnings),
            };
          }) ?? null,
      },
    ],
    [
      programSlug,
      programs,
      types,
      links,
      customers,
      statuses,
      displayProperties,
    ],
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
      ...(customerId && programSlug
        ? [{ key: "customerId", value: customerId }]
        : []),
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
