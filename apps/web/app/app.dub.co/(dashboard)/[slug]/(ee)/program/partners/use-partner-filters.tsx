import useGroups from "@/lib/swr/use-groups";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy, Users6 } from "@dub/ui/icons";
import { cn, COUNTRIES, nFormatter } from "@dub/utils";
import { useMemo } from "react";

export function usePartnerFilters(extraSearchParams: Record<string, string>) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId, slug } = useWorkspace();

  const { groups } = useGroups();

  const { partnersCount: countriesCount } = usePartnersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "country",
  });

  const { partnersCount: statusCount } = usePartnersCount<
    | {
        status: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "status",
  });

  const { partnersCount: groupCount } = usePartnersCount<
    | {
        groupId: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "groupId",
  });

  const filters = useMemo(
    () => [
      {
        key: "groupId",
        icon: Users6,
        label: "Group",
        options:
          groupCount
            ?.map(({ groupId, _count }) => {
              const groupData = groups?.find(({ id }) => id === groupId);
              if (!groupData) return null;

              return {
                value: groupId,
                label: groupData.name,
                icon: <GroupColorCircle group={groupData} />,
                right: nFormatter(_count || 0, { full: true }),
                permalink: `/${slug}/program/groups/${groupData.slug}/rewards`,
              };
            })
            .filter(Boolean) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusCount
            ?.filter(({ status }) => !["pending", "rejected"].includes(status))
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
      {
        key: "country",
        icon: FlagWavy,
        label: "Location",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
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
    ],
    [groupCount, groups, statusCount, countriesCount],
  );

  const activeFilters = useMemo(() => {
    const { status, country, groupId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
      ...(groupId ? [{ key: "groupId", value: groupId }] : []),
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
      del: ["status", "country", "groupId", "search"],
    });

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
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
    searchQuery,
    isFiltered,
  };
}
