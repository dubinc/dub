"use client";

import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { PartnerTagProps } from "@/lib/types";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import { AudienceLimitSelectShell } from "@/ui/partners/audience-limit-select-shell";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

export function PartnerTagsSelect({
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
