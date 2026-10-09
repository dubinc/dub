import { useProgramApplicationsCount } from "@/lib/program-applications/hooks/use-program-applications-count";
import useGroups from "@/lib/swr/use-groups";
import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { CountryFlag } from "@/ui/shared/country-flag";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Users6 } from "@dub/ui/icons";
import {
  buildFilterValue,
  COUNTRIES,
  nFormatter,
  parseFilterValue,
  type ParsedFilter,
} from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import * as z from "zod/v4";

const FILTER_KEYS = ["groupId", "country"] as const;

type ProgramApplicationFilterKey = (typeof FILTER_KEYS)[number];

type ProgramApplicationFilterStatus = z.infer<
  typeof getProgramApplicationsCountQuerySchema
>["status"];

type GroupedCount<TKey extends ProgramApplicationFilterKey> =
  | Array<{ [K in TKey]: string | null } & { _count: number }>
  | undefined;

function isFilterKey(key: string): key is ProgramApplicationFilterKey {
  return FILTER_KEYS.some((filterKey) => filterKey === key);
}

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

export function useProgramApplicationsFilters({
  status,
  enabledFilters,
}: {
  status: ProgramApplicationFilterStatus;
  enabledFilters: ProgramApplicationFilterKey[];
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [, setSearch] = useState("");

  const isFilterOptionsEnabled = (key: ProgramApplicationFilterKey) =>
    enabledFilters.includes(key) &&
    (selectedFilter === key || Boolean(searchParamsObj[key]));

  const { groups } = useGroups();

  const { applicationsCount: countriesCount } = useProgramApplicationsCount<
    GroupedCount<"country">
  >({
    groupBy: "country",
    status,
    enabled: isFilterOptionsEnabled("country"),
  });

  const { applicationsCount: groupsCount } = useProgramApplicationsCount<
    GroupedCount<"groupId">
  >({
    groupBy: "groupId",
    status,
    enabled: isFilterOptionsEnabled("groupId"),
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
                        };
                      })
                      .filter((group) => group !== null)
                  : null,
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
                countriesCount?.flatMap(({ country, _count }) => {
                  if (!country || !COUNTRIES[country]) {
                    return [];
                  }

                  return [
                    {
                      value: country,
                      label: COUNTRIES[country],
                      right: nFormatter(_count, { full: true }),
                    },
                  ];
                }) ?? null,
              getOptionIcon: (value: string) => (
                <CountryFlag countryCode={value} />
              ),
              getOptionLabel: (value: string) => COUNTRIES[value],
            },
          ]
        : []),
    ],
    [enabledFilters, groupsCount, groups, countriesCount],
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
      groupId: groupIdParsed,
      country: countryParsed,
    }),
    [groupIdParsed, countryParsed],
  );

  const activeFilters = useMemo(() => {
    return FILTER_KEYS.flatMap((key) => {
      if (!enabledFilters.includes(key)) return [];
      const parsed = parsedByKey[key];
      if (!parsed) return [];
      return [{ key, values: parsed.values, operator: parsed.operator }];
    });
  }, [enabledFilters, parsedByKey]);

  const onSelect = useCallback(
    (key: string, value: unknown) => {
      if (!isFilterKey(key)) return;

      const parsed = parsedByKey[key];
      const currentValues = parsed?.values ?? [];
      const next = String(value);
      const newValues = currentValues.includes(next)
        ? currentValues
        : [...currentValues, next];

      queryParams({
        set: { [key]: buildMultiValueParam(parsed, newValues) },
        del: "page",
      });
    },
    [queryParams, parsedByKey],
  );

  const onRemove = useCallback(
    (key: string, value?: unknown) => {
      if (!isFilterKey(key) || !value) {
        return queryParams({ del: [key, "page"] });
      }

      const parsed = parsedByKey[key];
      const newValues = (parsed?.values ?? []).filter((v) => v !== value);

      if (newValues.length === 0) {
        return queryParams({ del: [key, "page"] });
      }

      queryParams({
        set: { [key]: buildMultiValueParam(parsed, newValues) },
        del: "page",
      });
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
      if (!isFilterKey(key)) return;

      const raw = searchParamsObj[key];
      if (!raw) return;

      const isNegated = raw.startsWith("-");
      const cleanValue = isNegated ? raw.slice(1) : raw;

      queryParams({
        set: { [key]: isNegated ? cleanValue : `-${cleanValue}` },
        del: "page",
      });
    },
    [queryParams, searchParamsObj],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["country", "groupId", "search", "page"],
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
    setSelectedFilter,
    setSearch,
  };
}
