import useGroups from "@/lib/swr/use-groups";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { encodeRangeToken, parseRangeToken, useRouterStuff } from "@dub/ui";
import {
  CircleDotted,
  CursorRays,
  FlagWavy,
  InvoiceDollar,
  MarketingTarget,
  MoneyBills2,
  UserPlus,
  Users6,
} from "@dub/ui/icons";
import { cn, COUNTRIES, currencyFormatter, nFormatter } from "@dub/utils";
import { useMemo } from "react";

const PARTNER_METRIC_RANGE = [
  {
    filterKey: "totalClicks",
    minParam: "totalClicksMin",
    maxParam: "totalClicksMax",
    metric: "totalClicks" as const,
    label: "Clicks",
    icon: CursorRays,
  },
  {
    filterKey: "totalLeads",
    minParam: "totalLeadsMin",
    maxParam: "totalLeadsMax",
    metric: "totalLeads" as const,
    label: "Leads",
    icon: UserPlus,
  },
  {
    filterKey: "totalConversions",
    minParam: "totalConversionsMin",
    maxParam: "totalConversionsMax",
    metric: "totalConversions" as const,
    label: "Conversions",
    icon: MarketingTarget,
  },
  {
    filterKey: "totalSaleAmount",
    minParam: "totalSaleAmountMin",
    maxParam: "totalSaleAmountMax",
    metric: "totalSaleAmount" as const,
    label: "Revenue",
    icon: InvoiceDollar,
    formatRangeBound: (n: number) => currencyFormatter(n),
    parseRangeInput: (raw: string) => {
      const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) {
        return Number.NaN;
      }
      return Math.round(n * 100);
    },
  },
  {
    filterKey: "totalCommissions",
    minParam: "totalCommissionsMin",
    maxParam: "totalCommissionsMax",
    metric: "totalCommissions" as const,
    label: "Commissions",
    icon: MoneyBills2,
    formatRangeBound: (n: number) => currencyFormatter(n),
    parseRangeInput: (raw: string) => {
      const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) {
        return Number.NaN;
      }
      return Math.round(n * 100);
    },
  },
] as const;

export type PartnerFilterKey =
  | "groupId"
  | "status"
  | "country"
  | (typeof PARTNER_METRIC_RANGE)[number]["filterKey"];

export function usePartnerFilters(
  extraSearchParams: Record<string, string>,
  enabledFilters: PartnerFilterKey[] = [
    "groupId",
    "status",
    "country",
    "totalClicks",
    "totalLeads",
    "totalConversions",
    "totalSaleAmount",
    "totalCommissions",
  ],
) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId, slug } = useWorkspace();
  const status = (searchParamsObj.status ||
    extraSearchParams.status ||
    "approved") as ProgramEnrollmentStatus;

  const { groups } = useGroups();

  const cohortParams = useMemo(
    () => ({
      ...(searchParamsObj.groupId && { groupId: searchParamsObj.groupId }),
      ...(searchParamsObj.country && { country: searchParamsObj.country }),
      ...(searchParamsObj.search && { search: searchParamsObj.search }),
    }),
    [searchParamsObj.groupId, searchParamsObj.country, searchParamsObj.search],
  );

  const { partnersCount: countriesCount } = usePartnersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "country",
    status,
    ...cohortParams,
    enabled: enabledFilters.includes("country"),
  });

  const { partnersCount: statusCount } = usePartnersCount<
    | {
        status: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "status",
    status,
    ...cohortParams,
    enabled: enabledFilters.includes("status"),
  });

  const { partnersCount: groupsCount } = usePartnersCount<
    | {
        groupId: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "groupId",
    status,
    ...cohortParams,
    enabled: enabledFilters.includes("groupId"),
  });

  const filters = useMemo(
    () => [
      ...(enabledFilters.includes("groupId")
        ? [
            {
              key: "groupId",
              icon: Users6,
              label: "Group",
              options:
                groupsCount && groups
                  ? groupsCount
                      .filter(({ groupId }) =>
                        groups.find(({ id }) => id === groupId),
                      )
                      .map(({ groupId, _count }) => {
                        const groupData = groups.find(
                          ({ id }) => id === groupId,
                        )!; // coerce cause we already filtered above

                        return {
                          value: groupId,
                          label: groupData.name,
                          icon: <GroupColorCircle group={groupData} />,
                          right: nFormatter(_count || 0, { full: true }),
                          permalink: `/${slug}/program/groups/${groupData.slug}/rewards`,
                        };
                      })
                      .filter((group) => group !== null)
                  : null,
            },
          ]
        : []),
      ...(enabledFilters.includes("status")
        ? [
            {
              key: "status",
              icon: CircleDotted,
              label: "Status",
              options:
                statusCount
                  ?.filter(
                    ({ status }) => !["pending", "rejected"].includes(status),
                  )
                  ?.map(({ status, _count }) => {
                    const Icon = PartnerStatusBadges[status].icon;
                    return {
                      value: status,
                      label: PartnerStatusBadges[status].label,
                      icon: (
                        <Icon
                          className={cn(
                            PartnerStatusBadges[status].className,
                            "size-4 bg-transparent",
                          )}
                        />
                      ),
                      right: nFormatter(_count || 0, { full: true }),
                    };
                  }) ?? [],
            },
          ]
        : []),
      ...(enabledFilters.includes("country")
        ? [
            {
              key: "country",
              icon: FlagWavy,
              label: "Location",
              separatorAfter: PARTNER_METRIC_RANGE.some((m) =>
                enabledFilters.includes(m.filterKey),
              ),
              getOptionIcon: (value: string) => (
                <img
                  alt={value}
                  src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              ),
              getOptionLabel: (value: string) => COUNTRIES[value],
              options:
                countriesCount
                  ?.filter(({ country }) => COUNTRIES[country])
                  .map(({ country, _count }) => ({
                    value: country,
                    label: COUNTRIES[country],
                    right: nFormatter(_count, { full: true }),
                  })) ?? [],
            },
          ]
        : []),
      ...PARTNER_METRIC_RANGE.filter((m) =>
        enabledFilters.includes(m.filterKey),
      ).map((m) => {
        const formatRangeBound =
          "formatRangeBound" in m && m.formatRangeBound
            ? m.formatRangeBound
            : (n: number) => nFormatter(n, { full: true });
        const parseRangeInput =
          "parseRangeInput" in m && m.parseRangeInput
            ? m.parseRangeInput
            : (raw: string) => {
                const n = Number.parseInt(raw.replace(/[^\d-]/g, ""), 10);
                return Number.isFinite(n) ? n : Number.NaN;
              };
        return {
          key: m.filterKey,
          icon: m.icon,
          label: m.label,
          type: "range" as const,
          options: null,
          ...(m.metric === "totalCommissions"
            ? {
                rangeDisplayScale: 100,
                rangeNumberStep: 0.01,
              }
            : {}),
          formatRangeBound,
          parseRangeInput,
          formatRangePillLabel: (token: string) => {
            const { min, max } = parseRangeToken(token);
            if (min != null && max != null) {
              return `${formatRangeBound(min)} – ${formatRangeBound(max)}`;
            }
            if (min != null) {
              return `${formatRangeBound(min)} – No max`;
            }
            if (max != null) {
              return `No min – ${formatRangeBound(max)}`;
            }
            return token;
          },
        };
      }),
    ],
    [groupsCount, groups, statusCount, countriesCount, slug, enabledFilters],
  );

  const activeFilters = useMemo(() => {
    const { groupId, status: statusParam, country } = searchParamsObj;

    return [
      ...(enabledFilters.includes("groupId") && groupId
        ? [{ key: "groupId", value: groupId }]
        : []),
      ...(enabledFilters.includes("status") && statusParam
        ? [{ key: "status", value: statusParam }]
        : []),
      ...(enabledFilters.includes("country") && country
        ? [{ key: "country", value: country }]
        : []),
      ...PARTNER_METRIC_RANGE.filter((m) =>
        enabledFilters.includes(m.filterKey),
      ).flatMap((m) => {
        const minRaw = searchParamsObj[m.minParam];
        const maxRaw = searchParamsObj[m.maxParam];
        const min =
          minRaw !== undefined && minRaw !== "" ? Number(minRaw) : undefined;
        const max =
          maxRaw !== undefined && maxRaw !== "" ? Number(maxRaw) : undefined;
        const minOk = min !== undefined && Number.isFinite(min);
        const maxOk = max !== undefined && Number.isFinite(max);
        if (!minOk && !maxOk) {
          return [];
        }
        return [
          {
            key: m.filterKey,
            value: encodeRangeToken(
              minOk ? min : undefined,
              maxOk ? max : undefined,
            ),
          },
        ];
      }),
    ];
  }, [searchParamsObj, enabledFilters]);

  const onSelect = (key: string, value: unknown) => {
    const metric = PARTNER_METRIC_RANGE.find((m) => m.filterKey === key);
    if (metric) {
      const { min, max } = parseRangeToken(String(value));
      queryParams({
        set: {
          ...(min != null ? { [metric.minParam]: String(min) } : {}),
          ...(max != null ? { [metric.maxParam]: String(max) } : {}),
        },
        del: [
          ...(min == null ? [metric.minParam] : []),
          ...(max == null ? [metric.maxParam] : []),
          "page",
        ],
      });
      return;
    }

    queryParams({
      set: { [key]: value as string },
      del: "page",
    });
  };

  const onRemove = (key: string, _value?: unknown) => {
    const metric = PARTNER_METRIC_RANGE.find((m) => m.filterKey === key);
    if (metric) {
      queryParams({
        del: [metric.minParam, metric.maxParam, "page"],
      });
      return;
    }

    queryParams({
      del: [key, "page"],
    });
  };

  const onRemoveFilter = (key: string) => {
    onRemove(key);
  };

  const onRemoveAll = () =>
    queryParams({
      del: [
        "status",
        "country",
        "groupId",
        "search",
        "totalClicksMin",
        "totalClicksMax",
        "totalLeadsMin",
        "totalLeadsMax",
        "totalConversionsMin",
        "totalConversionsMax",
        "totalSaleAmountMin",
        "totalSaleAmountMax",
        "totalCommissionsMin",
        "totalCommissionsMax",
        "page",
      ],
    });

  const searchQuery = useMemo(() => {
    const acc: Record<string, string> = {
      workspaceId: workspaceId || "",
      ...extraSearchParams,
    };
    if (searchParamsObj.search) {
      acc.search = searchParamsObj.search;
    }
    for (const { key, value } of activeFilters) {
      const metric = PARTNER_METRIC_RANGE.find((m) => m.filterKey === key);
      if (metric) {
        const { min, max } = parseRangeToken(String(value));
        if (min != null) {
          acc[metric.minParam] = String(min);
        }
        if (max != null) {
          acc[metric.maxParam] = String(max);
        }
      } else {
        acc[key] = String(value);
      }
    }
    return new URLSearchParams(acc).toString();
  }, [activeFilters, workspaceId, extraSearchParams, searchParamsObj.search]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    searchQuery,
  };
}
