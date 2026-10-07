"use client";

import useGroups from "@/lib/swr/use-groups";
import { GroupProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { AudienceLimitSelectShell } from "@/ui/partners/audience-limit-select-shell";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

type GroupWithPartners = GroupProps & { totalPartners?: number };

export function PartnerGroupsSelect({
  selectedGroupIds,
  setSelectedGroupIds,
}: {
  selectedGroupIds: string[] | null;
  setSelectedGroupIds: (groupIds: string[] | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);
  const [shouldSortGroups, setShouldSortGroups] = useState(false);
  const [sortedGroups, setSortedGroups] = useState<
    GroupWithPartners[] | undefined
  >(undefined);

  const { groups } = useGroups<GroupWithPartners>({
    query: { ...(useAsync ? { search: debouncedSearch } : undefined) },
  });

  const { groups: selectedGroups } = useGroups<GroupWithPartners>({
    query: { groupIds: selectedGroupIds ?? undefined },
    enabled: Boolean(selectedGroupIds?.length),
  });

  useEffect(
    () =>
      setUseAsync(
        Boolean(groups && !useAsync && groups.length >= GROUPS_MAX_PAGE_SIZE),
      ),
    [groups, useAsync],
  );

  const sortGroups = useCallback(
    (groups: GroupWithPartners[], search: string) => {
      return search === ""
        ? [
            ...groups.filter((g) => selectedGroupIds?.includes(g.id)),
            ...groups.filter((g) => !selectedGroupIds?.includes(g.id)),
          ]
        : groups;
    },
    [selectedGroupIds],
  );

  useEffect(() => {
    if (
      !shouldSortGroups ||
      !groups ||
      (selectedGroupIds?.length && !selectedGroups)
    )
      return;

    setSortedGroups(
      sortGroups(
        [
          ...(selectedGroups ?? []),
          ...groups.filter(
            (g) => !selectedGroups?.some((sg) => sg.id === g.id),
          ),
        ],
        search,
      ),
    );
    setShouldSortGroups(false);
  }, [
    shouldSortGroups,
    groups,
    selectedGroupIds,
    selectedGroups,
    sortGroups,
    search,
  ]);

  useEffect(() => setShouldSortGroups(true), [groups]);

  return (
    <AudienceLimitSelectShell
      selectedIds={selectedGroupIds}
      setSelectedIds={setSelectedGroupIds}
      title="Limit to specific groups"
      enabledDescription="Select eligible groups"
      disabledDescription="All groups are eligible"
      searchPlaceholder="Search groups..."
      search={search}
      setSearch={setSearch}
      useAsync={useAsync}
      items={sortedGroups}
      getItemValue={(group) => `${group.name}::${group.slug}`}
      renderItem={(group) => (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <GroupColorCircle group={group} />
            <span className="min-w-0 truncate">{group.name}</span>
          </div>
        </>
      )}
    />
  );
}
