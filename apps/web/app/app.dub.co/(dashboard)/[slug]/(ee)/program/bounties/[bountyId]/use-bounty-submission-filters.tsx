import {
  SubmissionsCountByStatus,
  useBountySubmissionsCount,
} from "@/lib/swr/use-bounty-submissions-count";
import useGroups from "@/lib/swr/use-groups";
import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps, EnrolledPartnerProps } from "@/lib/types";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { Users, Users6 } from "@dub/ui/icons";
import { cn, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submission-status-badges";

export function useBountySubmissionFilters({
  bounty,
}: {
  bounty?: BountyProps;
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { slug } = useWorkspace();
  const { groups } = useGroups();

  const { submissionsCount } =
    useBountySubmissionsCount<SubmissionsCountByStatus[]>();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partners, partnersAsync } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const filters = useMemo(
    () => [
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: !partnersAsync,
        options:
          partners?.map(({ id, name, image }) => {
            return {
              value: id,
              label: name,
              icon: (
                <img
                  src={image || `${OG_AVATAR_URL}${id}`}
                  alt={`${name} image`}
                  className="size-4 rounded-full"
                />
              ),
            };
          }) ?? null,
      },
      {
        key: "groupId",
        icon: Users6,
        label: "Group",
        options:
          groups // only show groups that are associated with the bounty
            ?.filter((group) =>
              bounty?.groups && bounty?.groups.length > 0
                ? bounty?.groups.map((g) => g.id).includes(group.id)
                : true,
            )
            .map((group) => {
              return {
                value: group.id,
                label: group.name,
                icon: <GroupColorCircle group={group} />,
                permalink: `/${slug}/program/groups/${group.slug}/rewards`,
              };
            }) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: submissionsCount
          ? submissionsCount.map(({ status, count }) => {
              const {
                label,
                icon: Icon,
                iconClassName,
              } = BOUNTY_SUBMISSION_STATUS_BADGES[status];
              return {
                value: status,
                label,
                icon: (
                  <Icon
                    className={cn("size-4 bg-transparent", iconClassName)}
                  />
                ),
                right: nFormatter(count, {
                  full: true,
                }),
              };
            })
          : null,
      },
    ],
    [groups, bounty, submissionsCount, slug, partners, partnersAsync],
  );

  const activeFilters = useMemo(() => {
    const { status, groupId, partnerId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(groupId ? [{ key: "groupId", value: groupId }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
    ];
  }, [
    searchParamsObj.status,
    searchParamsObj.groupId,
    searchParamsObj.partnerId,
  ]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["status", "groupId", "partnerId"],
      }),
    [queryParams],
  );

  const isFiltered = useMemo(
    () => activeFilters.length > 0 || searchParamsObj.search,
    [activeFilters, searchParamsObj.search],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSearch,
    setSelectedFilter,
  };
}

function usePartnerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { partnersCount } = usePartnersCount<number>({
    ignoreParams: true,
  });

  const partnersAsync = Boolean(
    partnersCount && partnersCount > PARTNERS_MAX_PAGE_SIZE,
  );

  const { partners, loading: partnersLoading } = usePartners({
    query: { search: partnersAsync ? search : "" },
  });

  const { partners: selectedPartners } = usePartners({
    query: {
      partnerIds: searchParamsObj.partnerId
        ? [searchParamsObj.partnerId]
        : undefined,
    },
    enabled: partnersAsync,
  });

  const result = useMemo(() => {
    return partnersLoading ||
      // Consider partners loading if we can't find the currently filtered partner
      (searchParamsObj.partnerId &&
        ![...(selectedPartners ?? []), ...(partners ?? [])].some(
          (p) => p.id === searchParamsObj.partnerId,
        ))
      ? null
      : ([
          ...(partners ?? []),
          // Add selected partner to list if not already in partners
          ...(selectedPartners
            ?.filter((st) => !partners?.some((t) => t.id === st.id))
            ?.map((st) => ({ ...st, hideDuringSearch: true })) ?? []),
        ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[]);
  }, [partnersLoading, partners, selectedPartners, searchParamsObj.partnerId]);

  return { partners: result, partnersAsync };
}
