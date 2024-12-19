"use client";

import useLinks from "@/lib/swr/use-links";
import { LinkProps } from "@/lib/types";
import { Combobox, LinkLogo } from "@dub/ui";
import { cn, getApexDomain, linkConstructor, truncate } from "@dub/utils";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const getLinkOption = (link: LinkProps) => ({
  value: link.id,
  label: linkConstructor({ ...link, pretty: true }),
  icon: (
    <LinkLogo
      apexDomain={getApexDomain(link.url)}
      className="h-4 w-4 sm:h-4 sm:w-4"
    />
  ),
  meta: {
    url: link.url,
  },
});

export function LinksSelector({
  selectedLinkIds,
  setSelectedLinkIds,
  disabled,
}: {
  selectedLinkIds: string[];
  setSelectedLinkIds: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { links } = useLinks(
    {
      search: debouncedSearch,
    },
    {
      keepPreviousData: false,
    },
  );

  const { links: selectedLinks } = useLinks({
    linkIds: selectedLinkIds,
  });

  const options = useMemo(
    () => links?.map((link) => getLinkOption(link)),
    [links],
  );

  const selectedOptions = useMemo(
    () =>
      selectedLinkIds
        .map((id) =>
          [...(links || []), ...(selectedLinks || [])].find((l) => l.id === id),
        )
        .filter(Boolean)
        .map((l) => getLinkOption(l as LinkProps)),
    [selectedLinkIds, links, selectedLinks],
  );

  return (
    <Combobox
      multiple
      caret
      matchTriggerWidth
      side="top" // Since this control is near the bottom of the page, prefer top to avoid jumping
      options={options}
      selected={selectedOptions ?? []}
      setSelected={(selected) => {
        setSelectedLinkIds(selected.map(({ value: id }) => id));
      }}
      shouldFilter={false}
      onSearchChange={setSearch}
      buttonProps={{
        disabled,
        className: cn(
          "h-auto py-1.5 px-2.5 w-full max-w-full text-gray-700 border-gray-300 items-start",
        ),
      }}
    >
      {selectedLinkIds.length === 0 ? (
        <div className="py-0.5">Select links...</div>
      ) : selectedLinks && selectedOptions ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.slice(0, 10).map((option) => (
            <span
              key={option.value}
              className="animate-fade-in flex min-w-0 items-center gap-1 rounded-md bg-gray-100 px-1.5 py-1 text-xs text-gray-600"
            >
              <LinkLogo
                apexDomain={getApexDomain(option.meta.url)}
                className="size-3 shrink-0 sm:size-3"
              />
              <span className="min-w-0 truncate">
                {truncate(option.label, 32)}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-gray-200" />
      )}
    </Combobox>
  );
}
