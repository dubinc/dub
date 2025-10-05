import useGroups from "@/lib/swr/use-groups";
import useGroupsCount from "@/lib/swr/use-groups-count";
import { GroupProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import {
  AnimatedSizeContainer,
  Check2,
  LoadingSpinner,
  Magnifier,
  ScrollContainer,
  ToggleGroup,
  Users6,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { GroupColorCircle } from "./group-color-circle";

interface GroupSelectorProps {
  selectedGroupIds: string[] | null;
  setSelectedGroupIds: (groupIds: string[] | null) => void;
}

export function GroupsMultiSelect({
  selectedGroupIds,
  setSelectedGroupIds,
}: GroupSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<"all" | "select">(
    selectedGroupIds?.length ? "select" : "all",
  );

  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);

  const [shouldSortGroups, setShouldSortGroups] = useState(false);
  const [sortedGroups, setSortedGroups] = useState<GroupProps[] | undefined>(
    undefined,
  );

  const { groupsCount } = useGroupsCount();

  const { groups } = useGroups({
    query: { ...(useAsync ? { search: debouncedSearch } : undefined) },
  });

  const { groups: selectedGroups } = useGroups({
    query: { groupIds: selectedGroupIds ?? undefined },
    enabled: Boolean(selectedGroupIds?.length),
  });

  // Determine if we should use async loading
  useEffect(
    () =>
      setUseAsync(
        Boolean(groups && !useAsync && groups.length >= GROUPS_MAX_PAGE_SIZE),
      ),
    [groups, useAsync],
  );

  const sortGroups = useCallback(
    (groups: GroupProps[], search: string) => {
      return search === ""
        ? [
            ...groups.filter((g) => selectedGroupIds?.includes(g.id)),
            ...groups.filter((g) => !selectedGroupIds?.includes(g.id)),
          ]
        : groups;
    },
    [selectedGroupIds],
  );

  // Actually sort the groups when needed
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

  // Sort when the search-filtered groups change
  useEffect(() => setShouldSortGroups(true), [groups]);

  return (
    <div>
      <ToggleGroup
        className="flex w-full items-center gap-1 rounded-lg border-none bg-neutral-100 p-1"
        optionClassName="h-8 flex items-center justify-center flex-1 text-sm normal-case"
        indicatorClassName="bg-white"
        options={[
          { value: "all", label: "All groups" },
          { value: "select", label: "Select groups" },
        ]}
        selected={selectedMode}
        selectAction={(value) => {
          setSelectedMode(value as "all" | "select");
          if (value === "all") setSelectedGroupIds(null);
        }}
      />

      <div className="mt-2">
        <AnimatedSizeContainer
          height
          transition={{ ease: "easeInOut", duration: 0.1 }}
          className="-m-0.5"
        >
          <div className="p-0.5">
            {selectedMode === "all" ? (
              <div className="flex flex-col items-center justify-center px-4 py-6">
                <div className="text-content-default flex items-center gap-1.5 font-semibold">
                  <Users6 className="size-4 shrink-0" />
                  {groupsCount === undefined ? (
                    <div className="h-5 w-6 animate-pulse rounded-md bg-neutral-200" />
                  ) : (
                    groupsCount
                  )}
                </div>
                <span className="text-content-subtle text-sm font-medium">
                  Groups selected
                </span>
              </div>
            ) : (
              <Command loop shouldFilter={!useAsync}>
                <label className="relative flex grow items-center overflow-hidden rounded-lg border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
                  <Magnifier className="text-content-default ml-3 size-3.5 shrink-0" />
                  <Command.Input
                    placeholder="Search groups..."
                    value={search}
                    onValueChange={setSearch}
                    className="grow border-none px-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  />
                </label>
                <ScrollContainer className="h-[190px]">
                  <Command.List
                    className={cn("flex w-full flex-col gap-1 py-1")}
                  >
                    {sortedGroups !== undefined ? (
                      <>
                        {sortedGroups.map((group) => {
                          const checked = Boolean(
                            selectedGroupIds?.includes(group.id),
                          );

                          return (
                            <Command.Item
                              key={group.id}
                              value={`${group.name}::${group.slug}`}
                              onSelect={() =>
                                setSelectedGroupIds(
                                  selectedGroupIds?.includes(group.id)
                                    ? selectedGroupIds.length === 1
                                      ? null // Revert to null if there will be no groups selected
                                      : selectedGroupIds.filter(
                                          (id) => id !== group.id,
                                        )
                                    : [...(selectedGroupIds ?? []), group.id],
                                )
                              }
                              className={cn(
                                "flex cursor-pointer select-none items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm text-neutral-700",
                                "data-[selected=true]:bg-neutral-100",
                              )}
                            >
                              <div
                                className={cn(
                                  "border-border-emphasis flex size-4 shrink-0 items-center justify-center rounded border bg-white transition-colors duration-75",
                                  checked &&
                                    "border-neutral-900 bg-neutral-900",
                                )}
                              >
                                {checked && (
                                  <span className="sr-only">Checked</span>
                                )}
                                <Check2
                                  className={cn(
                                    "size-2.5 text-white transition-[transform,opacity] duration-75",
                                    !checked && "scale-75 opacity-0",
                                  )}
                                />
                              </div>
                              <div className="flex min-w-0 items-center gap-2">
                                <GroupColorCircle group={group} />
                                <span className="min-w-0 truncate">
                                  {group.name}
                                </span>
                              </div>
                            </Command.Item>
                          );
                        })}
                        {!useAsync ? (
                          <Command.Empty className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                            No matches
                          </Command.Empty>
                        ) : sortedGroups.length === 0 ? (
                          <div className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                            No matches
                          </div>
                        ) : null}
                      </>
                    ) : (
                      // undefined data / explicit loading state
                      <Command.Loading>
                        <div className="flex h-12 items-center justify-center">
                          <LoadingSpinner />
                        </div>
                      </Command.Loading>
                    )}
                  </Command.List>
                </ScrollContainer>
              </Command>
            )}
          </div>
        </AnimatedSizeContainer>
      </div>
    </div>
  );
}
