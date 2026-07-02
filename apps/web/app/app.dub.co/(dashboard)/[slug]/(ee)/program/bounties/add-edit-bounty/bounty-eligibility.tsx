"use client";

import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { GroupExtendedProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import {
  AnimatedSizeContainer,
  Check2,
  LoadingSpinner,
  Magnifier,
  ScrollContainer,
  Switch,
  Users6,
} from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { Command } from "cmdk";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { useBountyFormContext } from "./bounty-form-context";

export function BountyEligibility() {
  const { control } = useBountyFormContext();

  return (
    <ProgramSheetAccordionItem value="eligibility">
      <ProgramSheetAccordionTrigger>Eligibility</ProgramSheetAccordionTrigger>
      <ProgramSheetAccordionContent>
        <div className="flex flex-col gap-6">
          <Controller
            control={control}
            name="groupIds"
            render={({ field }) => (
              <EligibilityToggle
                title="Limit to specific groups"
                enabledDescription="Select eligible groups"
                disabledDescription="All groups are eligible"
                defaultEnabled={Boolean(field.value?.length)}
                onDisable={() => field.onChange(null)}
              >
                <GroupsEligibilitySelect
                  selectedIds={field.value}
                  setSelectedIds={(ids) => field.onChange(ids)}
                />
              </EligibilityToggle>
            )}
          />

          <Controller
            control={control}
            name="partnerTagIds"
            render={({ field }) => (
              <EligibilityToggle
                title="Limit to specific partner tags"
                enabledDescription="Select eligible partner tags"
                disabledDescription="All partner tags are eligible"
                defaultEnabled={Boolean(field.value?.length)}
                onDisable={() => field.onChange(null)}
              >
                <TagsEligibilitySelect
                  selectedIds={field.value}
                  setSelectedIds={(ids) => field.onChange(ids)}
                />
              </EligibilityToggle>
            )}
          />
        </div>
      </ProgramSheetAccordionContent>
    </ProgramSheetAccordionItem>
  );
}

function EligibilityToggle({
  title,
  enabledDescription,
  disabledDescription,
  defaultEnabled,
  onDisable,
  children,
}: {
  title: string;
  enabledDescription: string;
  disabledDescription: string;
  defaultEnabled: boolean;
  onDisable: () => void;
  children: ReactNode;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div>
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          fn={(checked: boolean) => {
            setEnabled(checked);
            if (!checked) onDisable();
          }}
          trackDimensions="w-8 h-4"
          thumbDimensions="w-3 h-3"
          thumbTranslate="translate-x-4"
        />
        <div className="flex flex-col">
          <span className="text-content-emphasis text-sm font-medium">
            {title}
          </span>
          <span className="text-content-subtle text-sm">
            {enabled ? enabledDescription : disabledDescription}
          </span>
        </div>
      </div>

      <AnimatedSizeContainer
        height
        transition={{ ease: "easeInOut", duration: 0.2 }}
        className="-m-0.5"
      >
        <div className="p-0.5">
          {enabled && <div className="mt-4">{children}</div>}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}

interface EligibilitySelectProps {
  selectedIds: string[] | null;
  setSelectedIds: (ids: string[] | null) => void;
}

function GroupsEligibilitySelect({
  selectedIds,
  setSelectedIds,
}: EligibilitySelectProps) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);

  const { groups } = useGroups<GroupExtendedProps>({
    query: {
      includeExpandedFields: true,
      ...(useAsync ? { search: debouncedSearch } : undefined),
    },
  });

  const { groups: selectedGroups } = useGroups<GroupExtendedProps>({
    query: {
      groupIds: selectedIds ?? undefined,
      includeExpandedFields: true,
    },
    enabled: Boolean(selectedIds?.length),
  });

  // Determine if we should use async loading
  useEffect(() => {
    setUseAsync(
      (prev) =>
        prev || Boolean(groups && groups.length >= GROUPS_MAX_PAGE_SIZE),
    );
  }, [groups]);

  return (
    <BountyEligibilityMultiSelect
      items={groups}
      selectedItems={selectedGroups}
      selectedIds={selectedIds}
      setSelectedIds={setSelectedIds}
      search={search}
      setSearch={setSearch}
      useAsync={useAsync}
      searchPlaceholder="Search groups..."
      getItemValue={(group) => `${group.name}::${group.slug}`}
      renderLeading={(group) => <GroupColorCircle group={group} />}
      renderRight={(group) => (
        <span className="text-content-subtle shrink-0 text-sm">
          {nFormatter(group.totalPartners, { full: true })} qualify
        </span>
      )}
    />
  );
}

function TagsEligibilitySelect({
  selectedIds,
  setSelectedIds,
}: EligibilitySelectProps) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);

  const { partnerTags } = usePartnerTags({
    query: { ...(useAsync ? { search: debouncedSearch } : undefined) },
  });

  const { partnerTags: selectedTags } = usePartnerTags({
    query: { ids: selectedIds ?? undefined },
    enabled: Boolean(selectedIds?.length),
  });

  const { partnersCount } = usePartnersCount<
    { partnerTagId: string; _count: number }[]
  >({
    groupBy: "partnerTagId",
    ignoreParams: true,
  });

  const tagCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(partnersCount)) {
      for (const { partnerTagId, _count } of partnersCount) {
        map.set(partnerTagId, _count);
      }
    }
    return map;
  }, [partnersCount]);

  // Determine if we should use async loading
  useEffect(() => {
    setUseAsync(
      (prev) =>
        prev ||
        Boolean(
          partnerTags && partnerTags.length >= PARTNER_TAGS_MAX_PAGE_SIZE,
        ),
    );
  }, [partnerTags]);

  return (
    <BountyEligibilityMultiSelect
      items={partnerTags}
      selectedItems={selectedTags}
      selectedIds={selectedIds}
      setSelectedIds={setSelectedIds}
      search={search}
      setSearch={setSearch}
      useAsync={useAsync}
      searchPlaceholder="Search tags..."
      renderRight={(tag) => (
        <div className="text-content-subtle flex shrink-0 items-center gap-1 text-sm">
          <Users6 className="size-3.5 shrink-0" />
          {nFormatter(tagCountMap.get(tag.id) ?? 0, { full: true })}
        </div>
      )}
    />
  );
}

interface BountyEligibilityMultiSelectProps<
  T extends { id: string; name: string },
> {
  // The current (optionally search-filtered) list of items, or undefined while loading
  items: T[] | undefined;
  // The currently selected items, so they remain visible even when not in `items`
  selectedItems: T[] | undefined;
  selectedIds: string[] | null;
  setSelectedIds: (ids: string[] | null) => void;
  search: string;
  setSearch: (search: string) => void;
  // Whether items are searched server-side (search input shouldn't filter locally)
  useAsync: boolean;
  searchPlaceholder: string;
  // Value used for local (cmdk) filtering — defaults to the item name
  getItemValue?: (item: T) => string;
  // Left-aligned visual rendered before the item name (e.g. a color circle)
  renderLeading?: (item: T) => ReactNode;
  // Right-aligned content rendered at the end of the row (e.g. a partner count)
  renderRight?: (item: T) => ReactNode;
}

function BountyEligibilityMultiSelect<T extends { id: string; name: string }>({
  items,
  selectedItems,
  selectedIds,
  setSelectedIds,
  search,
  setSearch,
  useAsync,
  searchPlaceholder,
  getItemValue,
  renderLeading,
  renderRight,
}: BountyEligibilityMultiSelectProps<T>) {
  const [shouldSort, setShouldSort] = useState(false);
  const [sortedItems, setSortedItems] = useState<T[] | undefined>(undefined);

  const sortItems = useCallback(
    (items: T[], search: string) => {
      return search === ""
        ? [
            ...items.filter((i) => selectedIds?.includes(i.id)),
            ...items.filter((i) => !selectedIds?.includes(i.id)),
          ]
        : items;
    },
    [selectedIds],
  );

  // Actually sort the items when needed
  useEffect(() => {
    if (!shouldSort || !items || (selectedIds?.length && !selectedItems))
      return;

    setSortedItems(
      sortItems(
        [
          ...(selectedItems ?? []),
          ...items.filter((i) => !selectedItems?.some((si) => si.id === i.id)),
        ],
        search,
      ),
    );
    setShouldSort(false);
  }, [shouldSort, items, selectedIds, selectedItems, sortItems, search]);

  // Re-sort when the search-filtered items or selection changes
  useEffect(() => setShouldSort(true), [items, selectedIds]);

  return (
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
        <Command.List className={cn("flex w-full flex-col gap-1 py-1")}>
          {sortedItems !== undefined ? (
            <>
              {sortedItems.map((item) => {
                const checked = Boolean(selectedIds?.includes(item.id));

                return (
                  <Command.Item
                    key={item.id}
                    value={getItemValue?.(item) ?? item.name}
                    onSelect={() =>
                      setSelectedIds(
                        selectedIds?.includes(item.id)
                          ? selectedIds.length === 1
                            ? null // Revert to null if there will be no items selected
                            : selectedIds.filter((id) => id !== item.id)
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
                        checked && "border-neutral-900 bg-neutral-900",
                      )}
                    >
                      {checked && <span className="sr-only">Checked</span>}
                      <Check2
                        className={cn(
                          "size-2.5 text-white transition-[transform,opacity] duration-75",
                          !checked && "scale-75 opacity-0",
                        )}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {renderLeading?.(item)}
                      <span className="min-w-0 truncate">{item.name}</span>
                    </div>
                    {renderRight?.(item)}
                  </Command.Item>
                );
              })}
              {!useAsync ? (
                <Command.Empty className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                  No matches
                </Command.Empty>
              ) : sortedItems.length === 0 ? (
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
  );
}
