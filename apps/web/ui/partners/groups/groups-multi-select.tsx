import useGroups from "@/lib/swr/use-groups";
import { GroupProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { Check2, LoadingSpinner, Magnifier, useScrollProgress } from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);

  const [shouldSortGroups, setShouldSortGroups] = useState(false);
  const [sortedGroups, setSortedGroups] = useState<GroupProps[] | undefined>(
    undefined,
  );

  const { groups } = useGroups({
    query: useAsync ? { search: debouncedSearch } : undefined,
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
        <Scroll>
          <Command.List className={cn("flex w-full flex-col gap-1 py-1")}>
            {sortedGroups !== undefined ? (
              <>
                {sortedGroups.map((group) => {
                  const checked = Boolean(selectedGroupIds?.includes(group.id));

                  return (
                    <Command.Item
                      key={group.id}
                      value={`${group.name}::${group.slug}`}
                      onSelect={() =>
                        setSelectedGroupIds(
                          selectedGroupIds?.includes(group.id)
                            ? selectedGroupIds.length === 1
                              ? null // Revert to null if there will be no groups selected
                              : selectedGroupIds.filter((id) => id !== group.id)
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
                          "border-border-emphasis flex size-4 items-center justify-center rounded border bg-white transition-colors duration-75",
                          checked && "border-neutral-900 bg-neutral-900",
                        )}
                      >
                        {checked && <span className="sr-only">Checked</span>}
                        <Check2
                          className={cn(
                            "transition=[transform,opacity] size-2.5 text-white duration-75",
                            !checked && "scale-75 opacity-0",
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <GroupColorCircle group={group} />
                        {group.name}
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
        </Scroll>
      </Command>
    </div>
  );
}

const Scroll = ({ children }: PropsWithChildren) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollProgress, updateScrollProgress } = useScrollProgress(ref);

  return (
    <>
      <div
        className="scrollbar-hide h-[200px] w-screen overflow-y-scroll sm:w-auto"
        ref={ref}
        onScroll={updateScrollProgress}
      >
        {children}
      </div>
      {/* Bottom scroll fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:block"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </>
  );
};
