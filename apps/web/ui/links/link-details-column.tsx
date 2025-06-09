import { TagProps } from "@/lib/types";
import { CardList, Tooltip, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import {
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { LinkAnalyticsBadge } from "./link-analytics-badge";
import { LinkControls } from "./link-controls";
import { useLinkSelection } from "./link-selection-provider";
import { LinksListContext, ResponseLink } from "./links-container";
import { LinksDisplayContext } from "./links-display-provider";
import TagBadge from "./tag-badge";

function useOrganizedTags(tags: ResponseLink["tags"]) {
  const searchParams = useSearchParams();

  const [primaryTag, additionalTags] = useMemo(() => {
    const filteredTagIds =
      searchParams?.get("tagIds")?.split(",")?.filter(Boolean) ?? [];

    /*
      Sort tags so that the filtered tags are first. The most recently selected
      filtered tag (last in array) should be displayed first.
    */
    const sortedTags =
      filteredTagIds.length > 0
        ? [...tags].sort(
            (a, b) =>
              filteredTagIds.indexOf(b.id) - filteredTagIds.indexOf(a.id),
          )
        : tags;

    return [sortedTags?.[0], sortedTags.slice(1)];
  }, [tags, searchParams]);

  return { primaryTag, additionalTags };
}

export function LinkDetailsColumn({ link }: { link: ResponseLink }) {
  const { tags } = link;

  const { displayProperties } = useContext(LinksDisplayContext);

  const ref = useRef<HTMLDivElement>(null);

  const { primaryTag, additionalTags } = useOrganizedTags(tags);

  return (
    <div ref={ref} className="flex items-center justify-end gap-2 sm:gap-5">
      {displayProperties.includes("tags") && primaryTag && (
        <TagsTooltip additionalTags={additionalTags}>
          <TagButton tag={primaryTag} plus={additionalTags.length} />
        </TagsTooltip>
      )}
      {displayProperties.includes("analytics") && (
        <LinkAnalyticsBadge link={link} />
      )}
      <Controls link={link} />
    </div>
  );
}

const Controls = memo(({ link }: { link: ResponseLink }) => {
  const { isSelectMode } = useLinkSelection();
  const { hovered } = useContext(CardList.Card.Context);

  const { openMenuLinkId, setOpenMenuLinkId } = useContext(LinksListContext);
  const openPopover = openMenuLinkId === link.id;
  const setOpenPopover = useCallback(
    (open: boolean) => {
      setOpenMenuLinkId(open ? link.id : null);
    },
    [link.id, setOpenMenuLinkId],
  );

  return (
    <div className={cn(isSelectMode && "hidden sm:block")}>
      <LinkControls
        link={link}
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        shortcutsEnabled={openPopover || (hovered && openMenuLinkId === null)}
      />
    </div>
  );
});

function TagsTooltip({
  additionalTags,
  children,
}: PropsWithChildren<{ additionalTags: TagProps[] }>) {
  return !!additionalTags.length ? (
    <Tooltip
      content={
        <div className="flex flex-wrap gap-1.5 p-3">
          {additionalTags.map((tag) => (
            <TagButton key={tag.id} tag={tag} />
          ))}
        </div>
      }
      side="top"
      align="end"
    >
      <div>{children}</div>
    </Tooltip>
  ) : (
    children
  );
}

function TagButton({ tag, plus }: { tag: TagProps; plus?: number }) {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();

  const selectedTagIds =
    searchParams?.get("tagIds")?.split(",")?.filter(Boolean) ?? [];

  return (
    <button
      onClick={() => {
        let newTagIds = selectedTagIds.includes(tag.id)
          ? selectedTagIds.filter((id) => id !== tag.id)
          : [...selectedTagIds, tag.id];

        queryParams({
          set: {
            tagIds: newTagIds.join(","),
          },
          del: [...(newTagIds.length ? [] : ["tagIds"])],
        });
      }}
    >
      <TagBadge {...tag} withIcon plus={plus} />
    </button>
  );
}
