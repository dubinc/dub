"use client";

import usePartnerLinks from "@/lib/swr/use-partner-links";
import { Combobox, LinkLogo } from "@dub/ui";
import { getApexDomain, linkConstructor, truncate } from "@dub/utils";

const ALL_LINKS_VALUE = "__all__";
const MAX_DISPLAYED_LINKS = 5;

export function PartnerLinksSelector({
  programId,
  selectedLinkIds,
  setSelectedLinkIds,
}: {
  programId: string;
  selectedLinkIds: string[] | undefined;
  setSelectedLinkIds: (ids: string[] | undefined) => void;
}) {
  const { links, loading } = usePartnerLinks({ programId });

  const isAllLinks = selectedLinkIds === undefined;

  const linkOptions = (links ?? []).map((link) => ({
    value: link.id,
    label: linkConstructor({
      domain: link.domain,
      key: link.key,
      pretty: true,
    }),
    icon: (
      <LinkLogo
        apexDomain={getApexDomain(link.url)}
        className="h-4 w-4 sm:h-4 sm:w-4"
      />
    ),
    meta: { url: link.url },
  }));

  const options = [
    {
      value: ALL_LINKS_VALUE,
      label: "All links",
    },
    ...linkOptions,
  ];

  const selected = isAllLinks
    ? [{ value: ALL_LINKS_VALUE, label: "All links" }]
    : linkOptions.filter((opt) => selectedLinkIds.includes(opt.value));

  const handleSelect = ({ value }: { value: string }) => {
    if (value === ALL_LINKS_VALUE) {
      setSelectedLinkIds(undefined);
      return;
    }

    if (isAllLinks) {
      // Switching from "All links" to a specific link
      setSelectedLinkIds([value]);
      return;
    }

    if (selectedLinkIds.includes(value)) {
      const remaining = selectedLinkIds.filter((id) => id !== value);
      // If nothing is selected, revert to all links
      if (remaining.length === 0) {
        setSelectedLinkIds(undefined);
      } else {
        setSelectedLinkIds(remaining);
      }
    } else {
      setSelectedLinkIds([...selectedLinkIds, value]);
    }
  };

  const displayedSelected = selected.slice(0, MAX_DISPLAYED_LINKS);
  const plusCount = Math.max(0, selected.length - MAX_DISPLAYED_LINKS);

  return (
    <Combobox
      multiple
      caret
      matchTriggerWidth
      side="bottom"
      options={loading ? [] : options}
      selected={selected}
      onSelect={handleSelect}
      buttonProps={{
        className:
          "h-auto py-1.5 px-2.5 w-full max-w-full text-neutral-700 border-neutral-300 items-start",
      }}
    >
      {loading ? (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      ) : isAllLinks ? (
        <div className="py-0.5">All links</div>
      ) : selected.length === 0 ? (
        <div className="py-0.5 text-neutral-500">Select links...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {displayedSelected.map((option) => (
            <span
              key={option.value}
              className="animate-fade-in flex min-w-0 items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-1 text-xs text-neutral-600"
            >
              {"meta" in option && option.meta ? (
                <LinkLogo
                  apexDomain={getApexDomain(
                    (option as { meta: { url: string } }).meta.url,
                  )}
                  className="size-3 shrink-0 sm:size-3"
                />
              ) : null}
              <span className="min-w-0 truncate">
                {truncate(option.label, 32)}
              </span>
            </span>
          ))}
          {plusCount > 0 && (
            <span className="animate-fade-in flex rounded-md bg-neutral-100 px-1.5 py-1 text-xs font-medium text-neutral-600">
              + {plusCount} more
            </span>
          )}
        </div>
      )}
    </Combobox>
  );
}
