import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { usePartnerTagsCount } from "@/lib/swr/use-partner-tags-count";
import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, PartnerTagProps } from "@/lib/types";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { CountryFlag } from "@/ui/shared/country-flag";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { encodeRangeToken, parseRangeToken, useRouterStuff } from "@dub/ui";
import {
  CircleDotted,
  CursorRays,
  FlagWavy,
  InvoiceDollar,
  MarketingTarget,
  MoneyBills2,
  Tag,
  UserArrowLeft,
  UserPlus,
  Users6,
} from "@dub/ui/icons";
import {
  buildFilterValue,
  cn,
  COUNTRIES,
  currencyFormatter,
  nFormatter,
  OG_AVATAR_URL,
  parseFilterValue,
} from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const CATEGORICAL_FILTER_KEYS = [
  "groupId",
  "partnerTagId",
  "status",
  "country",
  "referredByPartnerId",
] as const;

type CategoricalFilterKey = (typeof CATEGORICAL_FILTER_KEYS)[number];

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
  | "referredByPartnerId"
  | (typeof PARTNER_METRIC_RANGE)[number]["filterKey"];

export function usePartnerFilters(
  extraSearchParams: Record<string, string>,
  enabledFilters: PartnerFilterKey[] = [
    "groupId",
    "partnerTagId",
    "status",
    "country",
    "referredByPartnerId",
    "totalClicks",
    "totalLeads",
    "totalConversions",
    "totalSaleAmount",
    "totalCommissions",
  ],
) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { slug } = useWorkspace();
  const status = (searchParamsObj.status ||
    extraSearchParams.status ||
    "approved_invited") as ProgramEnrollmentStatus;

  const cohortParams = useMemo(
    () => ({
      ...(searchParamsObj.groupId && { groupId: searchParamsObj.groupId }),
      ...(searchParamsObj.country && { country: searchParamsObj.country }),
      ...(searchParamsObj.search && { search: searchParamsObj.search }),
    }),
    [searchParamsObj.groupId, searchParamsObj.country, searchParamsObj.search],
  );

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partnerTags, partnerTagsAsync } = usePartnerTagFilterOptions({
    search: selectedFilter === "partnerTagId" ? debouncedSearch : "",
    enabled: enabledFilters.includes("partnerTagId"),
    status,
    cohortParams,
  });

  const { groups } = useGroups();

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

  const { partnersCount: referredByCount } = usePartnersCount<
    | {
        referredByPartnerId: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "referredByPartnerId",
    status,
    ...cohortParams,
    enabled: enabledFilters.includes("referredByPartnerId"),
  });

  const { referredByPartners } = useReferredByPartnerFilterOptions({
    search: selectedFilter === "referredByPartnerId" ? debouncedSearch : "",
    enabled: enabledFilters.includes("referredByPartnerId"),
    status: searchParamsObj.search ? undefined : status,
  });

  const referredByCountMap = useMemo(
    () =>
      new Map(
        referredByCount?.map((r) => [r.referredByPartnerId, r._count]) ?? [],
      ),
    [referredByCount],
  );

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
              options:
                statusCount
                  ?.filter(
                    ({ status }) => !["pending", "rejected"].includes(status),
                  )
                  ?.map(({ status, _count }) => {
                    const {
                      label,
                      icon: Icon,
                      className,
                    } = PartnerStatusBadges[status];
                    return {
                      value: status,
                      label,
                      icon: (
                        <Icon
                          className={cn(className, "size-4 bg-transparent")}
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
              options:
                countriesCount
                  ?.filter(({ country }) => COUNTRIES[country])
                  .map(({ country, _count }) => ({
                    value: country,
                    label: COUNTRIES[country],
                    right: nFormatter(_count, { full: true }),
                  })) ?? [],
              getOptionIcon: (value: string) => (
                <CountryFlag countryCode={value} />
              ),
              getOptionLabel: (value: string) => COUNTRIES[value],
            },
          ]
        : []),
      ...(enabledFilters.includes("referredByPartnerId")
        ? [
            {
              key: "referredByPartnerId",
              icon: UserArrowLeft,
              label: "Referred by",
              shouldFilter: false,
              separatorAfter: PARTNER_METRIC_RANGE.some((m) =>
                enabledFilters.includes(m.filterKey),
              ),
              options:
                referredByPartners?.map(({ id, name, image }) => {
                  const count = referredByCountMap.get(id);
                  return {
                    value: id,
                    label: name,
                    icon: (
                      <img
                        src={image || `${OG_AVATAR_URL}${id}`}
                        alt={`${name} avatar`}
                        className="size-4 rounded-full"
                      />
                    ),
                    ...(count !== undefined && {
                      right: nFormatter(count, { full: true }),
                    }),
                  };
                }) ?? null,
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
      referredByPartners,
      referredByCountMap,
    ],
  );

  const activeFilters = useMemo(() => {
    const categoricalFilters = CATEGORICAL_FILTER_KEYS.flatMap((key) => {
      if (!enabledFilters.includes(key)) return [];
      const parsed = parseFilterValue(searchParamsObj[key]);
      if (!parsed?.values.length) return [];
      return [
        {
          key,
          values: parsed.values,
          operator: parsed.operator,
        },
      ];
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
    return [...categoricalFilters, ...metricFilters];
  }, [searchParamsObj, enabledFilters]);

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

      if (!CATEGORICAL_FILTER_KEYS.includes(key as CategoricalFilterKey)) {
        return;
      }

      const currentParam = searchParamsObj[key];
      const parsed = parseFilterValue(currentParam);
      const next = String(value);

      if (!currentParam || !parsed) {
        return queryParams({
          set: {
            [key]: buildFilterValue({
              operator: "IS",
              sqlOperator: "IN",
              values: [next],
            }),
          },
          del: "page",
        });
      }

      if (parsed.values.includes(next)) {
        return;
      }

      const newValues = [...parsed.values, next];
      return queryParams({
        set: {
          [key]: buildFilterValue({
            operator: parsed.operator.includes("NOT")
              ? parsed.operator
              : newValues.length > 1
                ? "IS_ONE_OF"
                : "IS",
            sqlOperator: parsed.sqlOperator,
            values: newValues,
          }),
        },
        del: "page",
      });
    },
    [queryParams, searchParamsObj],
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
        CATEGORICAL_FILTER_KEYS.includes(key as CategoricalFilterKey) &&
        value != null
      ) {
        const currentParam = searchParamsObj[key];
        const parsed = parseFilterValue(currentParam);
        if (!parsed) {
          return queryParams({ del: [key, "page"] });
        }
        const newValues = parsed.values.filter((v) => v !== String(value));
        if (newValues.length === 0) {
          return queryParams({ del: [key, "page"] });
        }
        return queryParams({
          set: {
            [key]: buildFilterValue({
              operator: parsed.operator.includes("NOT")
                ? parsed.operator
                : newValues.length > 1
                  ? "IS_ONE_OF"
                  : "IS",
              sqlOperator: parsed.sqlOperator,
              values: newValues,
            }),
          },
          del: "page",
        });
      }
      return queryParams({ del: [key, "page"] });
    },
    [queryParams, searchParamsObj],
  );

  const onRemoveFilter = useCallback(
    (key: string) => {
      const metric = PARTNER_METRIC_RANGE.find((m) => m.filterKey === key);
      if (metric) {
        return queryParams({
          del: [metric.minParam, metric.maxParam, "page"],
        });
      }
      return queryParams({ del: [key, "page"] });
    },
    [queryParams],
  );

  const onToggleOperator = useCallback(
    (key: string) => {
      if (!CATEGORICAL_FILTER_KEYS.includes(key as CategoricalFilterKey)) {
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

  const onOpenFilter = useCallback(
    (key: string | null) => setSelectedFilter(key),
    [],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: [
          "status",
          "country",
          "groupId",
          "partnerTagId",
          "referredByPartnerId",
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

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    onToggleOperator,
    onOpenFilter,
    setSearch,
  };
}

function usePartnerTagFilterOptions({
  search,
  enabled = true,
  status,
  cohortParams,
}: {
  search: string;
  enabled?: boolean;
  status: ProgramEnrollmentStatus;
  cohortParams: {
    groupId?: string;
    country?: string;
    search?: string;
  };
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
  >({
    groupBy: "partnerTagId",
    status,
    ...cohortParams,
    enabled,
  });

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
      : (
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
          .sort((a, b) => b.count - a.count) ?? null;
  }, [
    isLoadingPartnerTags,
    partnerTags,
    selectedPartnerTags,
    partnersCount,
    tagIds,
  ]);

  return { partnerTags: tagsResult, partnerTagsAsync: useAsync };
}

function useReferredByPartnerFilterOptions({
  search,
  enabled = true,
  status,
}: {
  search: string;
  enabled?: boolean;
  status?: ProgramEnrollmentStatus;
}) {
  const { searchParamsObj } = useRouterStuff();

  const activePartnerIds = useMemo(() => {
    const parsed = parseFilterValue(searchParamsObj.referredByPartnerId);
    return parsed?.values ?? [];
  }, [searchParamsObj.referredByPartnerId]);

  const query = { search, ...(status && { status }) };

  const { partners, loading: partnersLoading } = usePartners({
    query,
    enabled,
  });

  const { partners: selectedPartners } = usePartners({
    query: {
      ...query,
      partnerIds: activePartnerIds.length ? activePartnerIds : undefined,
    },
    enabled: enabled && activePartnerIds.length > 0,
  });

  const result = useMemo(() => {
    if (
      partnersLoading ||
      (activePartnerIds.length &&
        !activePartnerIds.every((id) =>
          [...(selectedPartners ?? []), ...(partners ?? [])].some(
            (p) => p.id === id,
          ),
        ))
    ) {
      return null;
    }

    return [
      ...(partners ?? []),
      ...(selectedPartners
        ?.filter((sp) => !partners?.some((p) => p.id === sp.id))
        ?.map((sp) => ({ ...sp, hideDuringSearch: true })) ?? []),
    ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[];
  }, [partnersLoading, partners, selectedPartners, activePartnerIds]);

  return { referredByPartners: result };
}
