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
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy, Tag, Users6 } from "@dub/ui/icons";
import {
  buildFilterValue,
  cn,
  COUNTRIES,
  nFormatter,
  parseFilterValue,
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

export function usePartnerFilters(
  extraSearchParams: Record<string, string>,
  enabledFilters: ("groupId" | "partnerTagId" | "status" | "country")[] = [
    "groupId",
    "partnerTagId",
    "status",
    "country",
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

  const { partnersCount: countriesCount } = usePartnersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "country",
    status,
    enabled: enabledFilters.includes("country"),
  });

  const { partnersCount: statusCount } = usePartnersCount<
    | {
        status: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "status", // here we include all statuses to get the groupBy count
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
              getOptionIcon: (value) => (
                <img
                  alt={value}
                  src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              ),
              getOptionLabel: (value) => COUNTRIES[value],
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
    return [...multiValueFilters, ...singleValueFilters];
  }, [searchParamsObj, enabledFilters, parsedByKey]);

  const onSelect = useCallback(
    (key: string, value: any) => {
      if (
        MULTI_VALUE_FILTER_KEYS.includes(
          key as (typeof MULTI_VALUE_FILTER_KEYS)[number],
        )
      ) {
        const parsed = parsedByKey[key as keyof typeof parsedByKey];
        const currentValues = parsed?.values ?? [];
        const newValues = currentValues.includes(value)
          ? currentValues
          : [...currentValues, value];
        const newParam = buildMultiValueParam(parsed, newValues);
        return queryParams({ set: { [key]: newParam }, del: "page" });
      }
      return queryParams({ set: { [key]: value }, del: "page" });
    },
    [queryParams, parsedByKey],
  );

  const onRemove = useCallback(
    (key: string, value?: any) => {
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

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "country", "groupId", "partnerTagId", "search"],
    });

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...activeFiltersToSearchParams(activeFilters),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
        workspaceId: workspaceId || "",
        ...extraSearchParams,
      }).toString(),
    [activeFilters, searchParamsObj.search, workspaceId, extraSearchParams],
  );

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    onToggleOperator,
    setSelectedFilter,
    setSearch,
    searchQuery,
    isFiltered,
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
