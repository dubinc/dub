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
} from "@dub/utils";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export function usePartnerFilters(
  extraSearchParams: Record<string, string>,
  enabledFilters: ("groupId" | "partnerTagIds" | "status" | "country")[] = [
    "groupId",
    "partnerTagIds",
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
    search: selectedFilter === "partnerTagIds" ? debouncedSearch : "",
    enabled: enabledFilters.includes("partnerTagIds"),
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
      ...(enabledFilters.includes("partnerTagIds")
        ? [
            {
              key: "partnerTagIds",
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

  const partnerTagIdsParsed = useMemo(
    () => parseFilterValue(searchParamsObj.partnerTagIds),
    [searchParamsObj.partnerTagIds],
  );
  const groupIdParsed = useMemo(
    () => parseFilterValue(searchParamsObj.groupId),
    [searchParamsObj.groupId],
  );
  const countryParsed = useMemo(
    () => parseFilterValue(searchParamsObj.country),
    [searchParamsObj.country],
  );

  const selectedTagIds = partnerTagIdsParsed?.values ?? [];

  const activeFilters = useMemo(() => {
    const { status } = searchParamsObj;

    return [
      ...(enabledFilters.includes("groupId") && groupIdParsed
        ? [
            {
              key: "groupId",
              values: groupIdParsed.values,
              operator: groupIdParsed.operator,
            },
          ]
        : []),
      ...(enabledFilters.includes("partnerTagIds") && partnerTagIdsParsed
        ? [
            {
              key: "partnerTagIds",
              values: partnerTagIdsParsed.values,
              operator: partnerTagIdsParsed.operator,
            },
          ]
        : []),
      ...(enabledFilters.includes("status") && status
        ? [{ key: "status", value: status }]
        : []),
      ...(enabledFilters.includes("country") && countryParsed
        ? [
            {
              key: "country",
              values: countryParsed.values,
              operator: countryParsed.operator,
            },
          ]
        : []),
    ];
  }, [
    searchParamsObj,
    enabledFilters,
    partnerTagIdsParsed,
    groupIdParsed,
    countryParsed,
  ]);

  const onSelect = (key: string, value: any) => {
    if (key === "partnerTagIds") {
      const newValues = selectedTagIds.includes(value)
        ? selectedTagIds
        : [...selectedTagIds, value];
      const newParam = buildFilterValue({
        operator: partnerTagIdsParsed?.operator ?? "IS_ONE_OF",
        sqlOperator: partnerTagIdsParsed?.sqlOperator ?? "IN",
        values: newValues,
      });
      return queryParams({ set: { partnerTagIds: newParam }, del: "page" });
    }
    if (key === "groupId" || key === "country") {
      const parsed = key === "groupId" ? groupIdParsed : countryParsed;
      const newValues = parsed?.values.includes(value)
        ? parsed.values
        : [...(parsed?.values ?? []), value];
      const newParam = buildFilterValue({
        operator: parsed?.operator ?? (newValues.length > 1 ? "IS_ONE_OF" : "IS"),
        sqlOperator: parsed?.sqlOperator ?? "IN",
        values: newValues,
      });
      return queryParams({ set: { [key]: newParam }, del: "page" });
    }
    return queryParams({ set: { [key]: value }, del: "page" });
  };

  const onRemove = (key: string, value?: any) => {
    if (key === "partnerTagIds" && value) {
      const newValues = selectedTagIds.filter((id) => id !== value);
      if (newValues.length === 0) {
        return queryParams({ del: [key, "page"] });
      }
      const newParam = buildFilterValue({
        operator: partnerTagIdsParsed?.operator ?? "IS_ONE_OF",
        sqlOperator: partnerTagIdsParsed?.sqlOperator ?? "IN",
        values: newValues,
      });
      return queryParams({ set: { partnerTagIds: newParam }, del: "page" });
    }
    if ((key === "groupId" || key === "country") && value) {
      const parsed = key === "groupId" ? groupIdParsed : countryParsed;
      const newValues = parsed?.values.filter((v) => v !== value) ?? [];
      if (newValues.length === 0) {
        return queryParams({ del: [key, "page"] });
      }
      const newParam = buildFilterValue({
        operator: parsed?.operator ?? (newValues.length > 1 ? "IS_ONE_OF" : "IS"),
        sqlOperator: parsed?.sqlOperator ?? "IN",
        values: newValues,
      });
      return queryParams({ set: { [key]: newParam }, del: "page" });
    }
    return queryParams({ del: [key, "page"] });
  };

  const onToggleOperator = (key: string) => {
    const paramKey =
      key === "partnerTagIds"
        ? "partnerTagIds"
        : key === "groupId"
          ? "groupId"
          : key === "country"
            ? "country"
            : null;
    if (!paramKey) return;

    const raw = searchParamsObj[paramKey];
    if (!raw) return;

    const isNegated = raw.startsWith("-");
    const cleanValue = isNegated ? raw.slice(1) : raw;
    const newParam = isNegated ? cleanValue : `-${cleanValue}`;

    queryParams({ set: { [paramKey]: newParam }, del: "page" });
  };

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "country", "groupId", "partnerTagIds", "search"],
    });

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
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
        ),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
        workspaceId: workspaceId || "",
        ...extraSearchParams,
      }).toString(),
    [activeFilters, workspaceId, extraSearchParams],
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
    const parsed = parseFilterValue(searchParamsObj.partnerTagIds);
    return parsed?.values ?? [];
  }, [searchParamsObj.partnerTagIds]);

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
