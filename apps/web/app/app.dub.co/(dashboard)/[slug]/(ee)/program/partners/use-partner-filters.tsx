import useGroups from "@/lib/swr/use-groups";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy, Users6 } from "@dub/ui/icons";
import { cn, COUNTRIES, nFormatter } from "@dub/utils";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { useMemo } from "react";

export function usePartnerFilters(extraSearchParams: Record<string, string>) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId, slug } = useWorkspace();
  const status = (searchParamsObj.status ||
    "approved") as ProgramEnrollmentStatus;

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
  });

  const { partnersCount: statusCount } = usePartnersCount<
    | {
        status: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "status", // here we include all statuses to get the groupBy count
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
  });

  const filters = useMemo(
    () => [
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
                  const groupData = groups.find(({ id }) => id === groupId)!; // coerce cause we already filtered above

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
    ],
    [groupsCount, groups, statusCount, countriesCount],
  );

  const activeFilters = useMemo(() => {
    const { groupId, status, country } = searchParamsObj;

    return [
      ...(groupId ? [{ key: "groupId", value: groupId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
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
