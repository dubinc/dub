"use client";

import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { GroupProps, PartnerTagProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  AnimatedSizeContainer,
  Check2,
  LoadingSpinner,
  Magnifier,
  ScrollContainer,
  Switch,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

type GroupWithPartners = GroupProps & { totalPartners?: number };

interface CampaignAudiencePanelProps {
  selectedGroupIds: string[] | null;
  setSelectedGroupIds: (groupIds: string[] | null) => void;
  selectedPartnerTagIds: string[] | null;
  setSelectedPartnerTagIds: (tagIds: string[] | null) => void;
  className?: string;
}

export function CampaignAudiencePanel({
  selectedGroupIds,
  setSelectedGroupIds,
  selectedPartnerTagIds,
  setSelectedPartnerTagIds,
  className,
}: CampaignAudiencePanelProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <PartnerGroupsSelect
        selectedGroupIds={selectedGroupIds}
        setSelectedGroupIds={setSelectedGroupIds}
      />
      <PartnerTagsSelect
        selectedPartnerTagIds={selectedPartnerTagIds}
        setSelectedPartnerTagIds={setSelectedPartnerTagIds}
      />
    </div>
  );
}

function AudienceLimitSelectShell<T extends { id: string }>({
  selectedIds,
  setSelectedIds,
  title,
  enabledDescription,
  disabledDescription,
  searchPlaceholder,
  search,
  setSearch,
  useAsync,
  items,
  getItemValue,
  renderItem,
}: {
  selectedIds: string[] | null;
  setSelectedIds: (ids: string[] | null) => void;
  title: string;
  enabledDescription: string;
  disabledDescription: string;
  searchPlaceholder: string;
  search: string;
  setSearch: (search: string) => void;
  useAsync: boolean;
  items: T[] | undefined;
  getItemValue: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const limitEnabled = selectedIds !== null;

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-5 shrink-0 items-center">
          <Switch
            checked={limitEnabled}
            fn={(checked) => {
              if (checked) {
                setSelectedIds(selectedIds ?? []);
              } else {
                setSelectedIds(null);
                setSearch("");
              }
            }}
            trackDimensions="w-8 h-4"
            thumbDimensions="w-3 h-3"
            thumbTranslate="translate-x-4"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-content-emphasis text-sm font-medium">
            {title}
          </span>
          <p className="text-content-subtle text-xs">
            {limitEnabled ? enabledDescription : disabledDescription}
          </p>
        </div>
      </div>

      <AnimatedSizeContainer
        height
        transition={{ ease: "easeInOut", duration: 0.1 }}
        className="-m-0.5"
      >
        <div className="p-0.5">
          {limitEnabled && (
            <div className="mt-3">
              <Command loop shouldFilter={!useAsync}>
                <label className="relative flex grow items-center overflow-hidden rounded-lg border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
                  <Magnifier className="text-content-default ml-3 size-3.5 shrink-0" />
                  <Command.Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onValueChange={setSearch}
                    className="grow border-none px-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  />
                </label>
                <ScrollContainer className="h-[190px]">
                  <Command.List className="flex w-full flex-col gap-1 py-1">
                    {items !== undefined ? (
                      <>
                        {items.map((item) => {
                          const checked = Boolean(
                            selectedIds?.includes(item.id),
                          );

                          return (
                            <Command.Item
                              key={item.id}
                              value={getItemValue(item)}
                              onSelect={() =>
                                setSelectedIds(
                                  selectedIds?.includes(item.id)
                                    ? selectedIds.filter((id) => id !== item.id)
                                    : [...(selectedIds ?? []), item.id],
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
                              {renderItem(item)}
                            </Command.Item>
                          );
                        })}
                        {!useAsync ? (
                          <Command.Empty className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                            No matches
                          </Command.Empty>
                        ) : items.length === 0 ? (
                          <div className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                            No matches
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <Command.Loading>
                        <div className="flex h-12 items-center justify-center">
                          <LoadingSpinner />
                        </div>
                      </Command.Loading>
                    )}
                  </Command.List>
                </ScrollContainer>
              </Command>
            </div>
          )}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}

function PartnerGroupsSelect({
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

function PartnerTagsSelect({
  selectedPartnerTagIds,
  setSelectedPartnerTagIds,
}: {
  selectedPartnerTagIds: string[] | null;
  setSelectedPartnerTagIds: (tagIds: string[] | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);
  const [shouldSortTags, setShouldSortTags] = useState(false);
  const [sortedTags, setSortedTags] = useState<PartnerTagProps[] | undefined>(
    undefined,
  );

  const { partnerTags } = usePartnerTags({
    query: useAsync ? { search: debouncedSearch } : undefined,
  });

  const { partnerTags: selectedTags } = usePartnerTags({
    query: { ids: selectedPartnerTagIds ?? undefined },
    enabled: Boolean(selectedPartnerTagIds?.length),
  });

  useEffect(
    () =>
      setUseAsync(
        Boolean(
          partnerTags &&
            !useAsync &&
            partnerTags.length >= PARTNER_TAGS_MAX_PAGE_SIZE,
        ),
      ),
    [partnerTags, useAsync],
  );

  const sortTags = useCallback(
    (tags: PartnerTagProps[], search: string) => {
      return search === ""
        ? [
            ...tags.filter((t) => selectedPartnerTagIds?.includes(t.id)),
            ...tags.filter((t) => !selectedPartnerTagIds?.includes(t.id)),
          ]
        : tags;
    },
    [selectedPartnerTagIds],
  );

  useEffect(() => {
    if (
      !shouldSortTags ||
      !partnerTags ||
      (selectedPartnerTagIds?.length && !selectedTags)
    )
      return;

    setSortedTags(
      sortTags(
        [
          ...(selectedTags ?? []),
          ...partnerTags.filter(
            (t) => !selectedTags?.some((st) => st.id === t.id),
          ),
        ],
        search,
      ),
    );
    setShouldSortTags(false);
  }, [
    shouldSortTags,
    partnerTags,
    selectedPartnerTagIds,
    selectedTags,
    sortTags,
    search,
  ]);

  useEffect(() => setShouldSortTags(true), [partnerTags]);

  return (
    <AudienceLimitSelectShell
      selectedIds={selectedPartnerTagIds}
      setSelectedIds={setSelectedPartnerTagIds}
      title="Limit to specific partner tags"
      enabledDescription="Select eligible partner tags"
      disabledDescription="All tags are eligible"
      searchPlaceholder="Search tags..."
      search={search}
      setSearch={setSearch}
      useAsync={useAsync}
      items={sortedTags}
      getItemValue={(tag) => `${tag.name}::${tag.id}`}
      renderItem={(tag) => (
        <span className="min-w-0 flex-1 truncate">{tag.name}</span>
      )}
    />
  );
}
