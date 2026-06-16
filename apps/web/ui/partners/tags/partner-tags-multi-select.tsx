import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { usePartnerTagsCount } from "@/lib/swr/use-partner-tags-count";
import { PartnerTagProps } from "@/lib/types";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import {
  AnimatedSizeContainer,
  Check2,
  LoadingSpinner,
  Magnifier,
  ScrollContainer,
  Tag,
  ToggleGroup,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

interface PartnerTagsMultiSelectProps {
  selectedTagIds: string[] | null;
  setSelectedTagIds: (tagIds: string[] | null) => void;
  className?: string;
}

export function PartnerTagsMultiSelect({
  selectedTagIds,
  setSelectedTagIds,
  className,
}: PartnerTagsMultiSelectProps) {
  const [selectedMode, setSelectedMode] = useState<"all" | "select">(
    selectedTagIds?.length ? "select" : "all",
  );

  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);

  const [shouldSortTags, setShouldSortTags] = useState(false);
  const [sortedTags, setSortedTags] = useState<PartnerTagProps[] | undefined>(
    undefined,
  );

  const { partnerTagsCount } = usePartnerTagsCount();

  const { partnerTags } = usePartnerTags({
    query: { ...(useAsync ? { search: debouncedSearch } : undefined) },
  });

  const { partnerTags: selectedTags } = usePartnerTags({
    query: { ids: selectedTagIds ?? undefined },
    enabled: Boolean(selectedTagIds?.length),
  });

  // Determine if we should use async loading
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
            ...tags.filter((t) => selectedTagIds?.includes(t.id)),
            ...tags.filter((t) => !selectedTagIds?.includes(t.id)),
          ]
        : tags;
    },
    [selectedTagIds],
  );

  // Actually sort the tags when needed
  useEffect(() => {
    if (
      !shouldSortTags ||
      !partnerTags ||
      (selectedTagIds?.length && !selectedTags)
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
    selectedTagIds,
    selectedTags,
    sortTags,
    search,
  ]);

  // Sort when the search-filtered tags change
  useEffect(() => setShouldSortTags(true), [partnerTags]);

  return (
    <div className={className}>
      <ToggleGroup
        layout={false}
        className="flex w-full items-center gap-1 rounded-lg border-none bg-neutral-100 p-1"
        optionClassName="h-8 flex items-center justify-center flex-1 text-sm normal-case"
        indicatorClassName="bg-white"
        options={[
          { value: "all", label: "All tags" },
          { value: "select", label: "Select tags" },
        ]}
        selected={selectedMode}
        selectAction={(value) => {
          setSelectedMode(value as "all" | "select");
          if (value === "all") setSelectedTagIds(null);
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
                  <Tag className="size-4 shrink-0" />
                  {partnerTagsCount === undefined ? (
                    <div className="h-5 w-6 animate-pulse rounded-md bg-neutral-200" />
                  ) : (
                    partnerTagsCount
                  )}
                </div>
                <span className="text-content-subtle text-sm font-medium">
                  Tags selected
                </span>
              </div>
            ) : (
              <Command loop shouldFilter={!useAsync}>
                <label className="relative flex grow items-center overflow-hidden rounded-lg border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
                  <Magnifier className="text-content-default ml-3 size-3.5 shrink-0" />
                  <Command.Input
                    placeholder="Search tags..."
                    value={search}
                    onValueChange={setSearch}
                    className="grow border-none px-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  />
                </label>
                <ScrollContainer className="h-[190px]">
                  <Command.List
                    className={cn("flex w-full flex-col gap-1 py-1")}
                  >
                    {sortedTags !== undefined ? (
                      <>
                        {sortedTags.map((tag) => {
                          const checked = Boolean(
                            selectedTagIds?.includes(tag.id),
                          );

                          return (
                            <Command.Item
                              key={tag.id}
                              value={tag.name}
                              onSelect={() =>
                                setSelectedTagIds(
                                  selectedTagIds?.includes(tag.id)
                                    ? selectedTagIds.length === 1
                                      ? null // Revert to null if there will be no tags selected
                                      : selectedTagIds.filter(
                                          (id) => id !== tag.id,
                                        )
                                    : [...(selectedTagIds ?? []), tag.id],
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
                                <Tag className="size-3.5 shrink-0 text-neutral-500" />
                                <span className="min-w-0 truncate">
                                  {tag.name}
                                </span>
                              </div>
                            </Command.Item>
                          );
                        })}
                        {!useAsync ? (
                          <Command.Empty className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                            No matches
                          </Command.Empty>
                        ) : sortedTags.length === 0 ? (
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
