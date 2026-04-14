import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { usePartnerTagsCount } from "@/lib/swr/use-partner-tags-count";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerTagProps } from "@/lib/types";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { useRouterStuff, encodeRangeToken, parseRangeToken } from "@dub/ui";
import { CircleDotted, FlagWavy, Tag, Users6, CursorRays, 
  InvoiceDollar,
  MarketingTarget,
  MoneyBills2,
  UserPlus, } from "@dub/ui/icons";
import {
  buildFilterValue,
  cn,
  COUNTRIES,
  nFormatter,
  parseFilterValue,
  currencyFormatter,
  type FilterOperator,
  type ParsedFilter,
} from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";



const SINGLE_VALUE_FILTER_KEYS = ["status"] as const;
const MULTI_VALUE_FILTER_KEYS = ["partnerTagId", "groupId", "country"] as const;

function buildMultiValueParam(
  parsed: ParsedFilter | undefined,
  values: string[],
): string {
  return buildFilterValue({
    operator: parsed?.operator ?? (values.length > 1 ? "IS_ONE_OF" : "IS"),
    sqlOperator: parsed?.sqlOperator ?? "IN",
    values,
  });
}

function activeFiltersToSearchParams(
  activeFilters: Array<
    | { key: string; values: string[]; operator: FilterOperator }
    | { key: string; value: string }
  >,
): Record<string, string> {
  return Object.fromEntries(
    activeFilters.flatMap((f) => {
      if ("values" in f && Array.isArray(f.values) && "operator" in f) {
        const values = f.values as string[];
        const op: FilterOperator =
          (f as { operator?: FilterOperator }).operator ??
          (values.length > 1 ? "IS_ONE_OF" : "IS");
        return [
          [
            f.key,
            buildFilterValue({
              operator: op,
              sqlOperator: op.includes("NOT") ? "NOT IN" : "IN",
              values,
            }),
          ],
        ];
      }
      if ("value" in f && f.value != null) {
        return [[f.key, f.value]];
      }
      return [];
    }),
  );
}

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
  | "partnerTagId"
  | "status"
  | "country"
  | (typeof PARTNER_METRIC_RANGE)[number]["filterKey"];

export function usePartnerFilters(
  extraSearchParams: Record<string, string>,
  enabledFilters: PartnerFilterKey[] = [
    "groupId",
    "partnerTagId",
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

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partnerTags, partnerTagsAsync } = usePartnerTagFilterOptions({
    search: selectedFilter === "partnerTagId" ? debouncedSearch : "",
    enabled: enabledFilters.includes("partnerTagId"),
  });

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
      ...(enabledFilters.includes("partnerTagId")
        ? [
            {
              key: "partnerTagId",
              icon: Tag,
              label: "Tag",
              multiple: true,
              shouldFilter: !partnerTagsAsync,
              options:
                partnerTags?.map(({ id, name, count, hideDuringSearch }) => ({
                  value: id,
                  label: name,
                  right: nFormatter(count, { full: true }),
                  hideDuringSearch,
                })) ?? null,
            },
          ]
        : []),
      ...(enabledFilters.includes("status")
        ? [
            {
              key: "status",
              icon: CircleDotted,
              label: "Status",
              singleSelect: true,
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
    [
      enabledFilters,
      groupsCount,
      groups,
      slug,
      partnerTags,
      partnerTagsAsync,
      statusCount,
      countriesCount,
    ],
  );

  const partnerTagIdParsed = useMemo(
    () => parseFilterValue(searchParamsObj.partnerTagId),
    [searchParamsObj.partnerTagId],
  );
  const groupIdParsed = useMemo(
    () => parseFilterValue(searchParamsObj.groupId),
    [searchParamsObj.groupId],
  );
  const countryParsed = useMemo(
    () => parseFilterValue(searchParamsObj.country),
    [searchParamsObj.country],
  );

  const parsedByKey = useMemo(
    () => ({
      partnerTagId: partnerTagIdParsed,
      groupId: groupIdParsed,
      country: countryParsed,
    }),
    [partnerTagIdParsed, groupIdParsed, countryParsed],
  );

  const activeFilters = useMemo(() => {
    const multiValueFilters = MULTI_VALUE_FILTER_KEYS.flatMap((key) => {
      if (!enabledFilters.includes(key)) return [];
      const parsed = parsedByKey[key];
      if (!parsed) return [];
      return [{ key, values: parsed.values, operator: parsed.operator }];
    });
    const singleValueFilters = SINGLE_VALUE_FILTER_KEYS.flatMap((key) => {
      if (!enabledFilters.includes(key)) return [];
      const value = searchParamsObj[key];
      if (!value) return [];
      return [{ key, value }];
    });
    const metricFilters = PARTNER_METRIC_RANGE.filter((m) =>
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
    });
    return [...multiValueFilters, ...singleValueFilters, ...metricFilters];
  }, [searchParamsObj, enabledFilters, parsedByKey]);

  const onSelect = useCallback(
    (key: string, value: unknown) => {
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

      if (
        MULTI_VALUE_FILTER_KEYS.includes(
          key as (typeof MULTI_VALUE_FILTER_KEYS)[number],
        )
      ) {
        const parsed = parsedByKey[key as keyof typeof parsedByKey];
        const currentValues = parsed?.values ?? [];
        const next = String(value);
        const newValues = currentValues.includes(next)
          ? currentValues
          : [...currentValues, next];
        const newParam = buildMultiValueParam(parsed, newValues);
        return queryParams({ set: { [key]: newParam }, del: "page" });
      }
      return queryParams({ set: { [key]: value as string }, del: "page" });
    },
    [queryParams, parsedByKey],
  );

  const onRemove = useCallback(
    (key: string, value?: unknown) => {
      const metric = PARTNER_METRIC_RANGE.find((m) => m.filterKey === key);
      if (metric) {
        queryParams({
          del: [metric.minParam, metric.maxParam, "page"],
        });
        return;
      }

      if (
        MULTI_VALUE_FILTER_KEYS.includes(
          key as (typeof MULTI_VALUE_FILTER_KEYS)[number],
        ) &&
        value
      ) {
        const parsed = parsedByKey[key as keyof typeof parsedByKey];
        const newValues = (parsed?.values ?? []).filter((v) => v !== value);
        if (newValues.length === 0) {
          return queryParams({ del: [key, "page"] });
        }
        const newParam = buildMultiValueParam(parsed, newValues);
        return queryParams({ set: { [key]: newParam }, del: "page" });
      }
      return queryParams({ del: [key, "page"] });
    },
    [queryParams, parsedByKey],
  );

  const onRemoveFilter = useCallback(
    (key: string) => {
      onRemove(key);
    },
    [onRemove],
  );

  const onToggleOperator = useCallback(
    (key: string) => {
      if (
        !MULTI_VALUE_FILTER_KEYS.includes(
          key as (typeof MULTI_VALUE_FILTER_KEYS)[number],
        )
      ) {
        return;
      }
      const raw = searchParamsObj[key];
      if (!raw) return;

      const isNegated = raw.startsWith("-");
      const cleanValue = isNegated ? raw.slice(1) : raw;
      const newParam = isNegated ? cleanValue : `-${cleanValue}`;

      queryParams({ set: { [key]: newParam }, del: "page" });
    },
    [queryParams, searchParamsObj],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: [
          "status",
          "country",
          "groupId",
          "partnerTagId",
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
      }),
    [queryParams],
  );

  const searchQuery = useMemo(() => {
    const acc: Record<string, string> = {
      workspaceId: workspaceId || "",
      ...extraSearchParams,
    };
    if (searchParamsObj.search) {
      acc.search = searchParamsObj.search;
    }
    for (const f of activeFilters) {
      const metric = PARTNER_METRIC_RANGE.find((m) => m.filterKey === f.key);
      if (metric && "value" in f && f.value != null) {
        const { min, max } = parseRangeToken(String(f.value));
        if (min != null) {
          acc[metric.minParam] = String(min);
        }
        if (max != null) {
          acc[metric.maxParam] = String(max);
        }
      } else {
        Object.assign(acc, activeFiltersToSearchParams([f]));
      }
    }
    return new URLSearchParams(acc).toString();
  }, [activeFilters, searchParamsObj.search, workspaceId, extraSearchParams]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    onToggleOperator,
    setSelectedFilter,
    setSearch,
    searchQuery,
  };
}

function usePartnerTagFilterOptions({
  search,
  enabled = true,
}: {
  search: string;
  enabled?: boolean;
}) {
  const { searchParamsObj } = useRouterStuff();

  const tagIds = useMemo(() => {
    const parsed = parseFilterValue(searchParamsObj.partnerTagId);
    return parsed?.values ?? [];
  }, [searchParamsObj.partnerTagId]);

  const { partnerTagsCount } = usePartnerTagsCount({ enabled });
  const useAsync = Boolean(
    enabled &&
    partnerTagsCount &&
    partnerTagsCount > PARTNER_TAGS_MAX_PAGE_SIZE,
  );
  const { partnerTags, isLoading: isLoadingPartnerTags } = usePartnerTags({
    query: { search: useAsync ? search : "" },
    enabled,
  });

  const { partnerTags: selectedPartnerTags } = usePartnerTags({
    query: { ids: tagIds },
    enabled: enabled && useAsync,
  });

  const { partnersCount } = usePartnersCount<
    {
      partnerTagId: string;
      _count: number;
    }[]
  >({ groupBy: "partnerTagId", enabled });

  const tagsResult = useMemo(() => {
    return isLoadingPartnerTags ||
      // Consider tags loading if we can't find the currently filtered tag
      (tagIds?.length &&
        tagIds.some(
          (id) =>
            ![...(selectedPartnerTags ?? []), ...(partnerTags ?? [])].some(
              (t) => t.id === id,
            ),
        ))
      ? null
      : ((
          [
            ...(partnerTags ?? []),
            // Add selected tag to list if not already in tags
            ...(selectedPartnerTags
              ?.filter((st) => !partnerTags?.some((t) => t.id === st.id))
              ?.map((st) => ({ ...st, hideDuringSearch: true })) ?? []),
          ] as (PartnerTagProps & { hideDuringSearch?: boolean })[]
        )
          ?.map((tag) => ({
            ...tag,
            count:
              partnersCount?.find(({ partnerTagId }) => partnerTagId === tag.id)
                ?._count || 0,
          }))
          .sort((a, b) => b.count - a.count) ?? null);
  }, [
    isLoadingPartnerTags,
    partnerTags,
    selectedPartnerTags,
    partnersCount,
    tagIds,
  ]);

  return { partnerTags: tagsResult, partnerTagsAsync: useAsync };
}
