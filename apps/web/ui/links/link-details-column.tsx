import { CompositeAnalyticsResponseOptions } from "@/lib/analytics/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { TagProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  CardList,
  Crosshairs,
  Tooltip,
  useIntersectionObserver,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { CursorRays, InvoiceDollar, LinesY } from "@dub/ui/src/icons";
import { cn, fetcher, nFormatter, timeAgo } from "@dub/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PropsWithChildren,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { LinkControls } from "./link-controls";
import { ResponseLink } from "./links-container";
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
  const entry = useIntersectionObserver(ref, {});
  const isVisible = !!entry?.isIntersecting;

  const { primaryTag, additionalTags } = useOrganizedTags(tags);

  return (
    <div ref={ref} className="flex items-center justify-end gap-2 sm:gap-5">
      {isVisible && (
        <>
          {displayProperties.includes("tags") && primaryTag && (
            <TagsTooltip additionalTags={additionalTags}>
              <TagButton tag={primaryTag} plus={additionalTags.length} />
            </TagsTooltip>
          )}
          {displayProperties.includes("analytics") && (
            <AnalyticsBadge link={link} />
          )}
          <LinkControls link={link} />
        </>
      )}
    </div>
  );
}

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
      side="bottom"
      align="end"
    >
      <div>{children}</div>
    </Tooltip>
  ) : (
    children
  );
}

function TagButton({ tag, plus }: { tag: TagProps; plus?: number }) {
  const { isMobile, isDesktop } = useMediaQuery();

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
      <TagBadge {...tag} withIcon={isMobile || isDesktop} plus={plus} />
    </button>
  );
}

function AnalyticsBadge({ link }: { link: ResponseLink }) {
  const { id, domain, key, trackConversion } = link;

  const { id: workspaceId, slug, exceededClicks } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const { data: totalEvents } = useSWR<{
    [key in CompositeAnalyticsResponseOptions]?: number;
  }>(
    // Only fetch data if there's a slug and the usage is not exceeded
    workspaceId &&
      !exceededClicks &&
      `/api/analytics?event=composite&workspaceId=${workspaceId}&linkId=${id}&interval=all_unfiltered`,
    fetcher,
    {
      fallbackData: {
        clicks: link.clicks,
        leads: link.leads,
        sales: link.sales,
      },
      dedupingInterval: 60000,
    },
  );

  const [hoveredId, setHoveredId] = useState<string>("clicks");
  const hoveredValue = totalEvents?.[hoveredId];

  const { variant } = useContext(CardList.Context);

  return isMobile ? (
    <Link
      href={`/${slug}/analytics?domain=${domain}&key=${key}`}
      className="rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-800"
    >
      <LinesY className="m-1 h-4 w-4 text-gray-600" />
    </Link>
  ) : (
    <Tooltip
      content={
        <AnimatedSizeContainer width height>
          <div
            key={hoveredId}
            className="whitespace-nowrap px-3 py-2 text-gray-600"
          >
            <p className="text-sm">
              <span className="font-medium text-gray-950">
                {nFormatter(hoveredValue)}
              </span>{" "}
              {hoveredValue !== 1 ? hoveredId : hoveredId.slice(0, -1)}
            </p>
            {hoveredId === "clicks" && (
              <p className="mt-1 text-xs text-gray-500">
                {link.lastClicked
                  ? `Last clicked ${timeAgo(link.lastClicked, {
                      withAgo: true,
                    })}`
                  : "No clicks recorded yet"}
              </p>
            )}
          </div>
        </AnimatedSizeContainer>
      }
    >
      <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-800">
        <div className="hidden items-center sm:flex">
          {[
            {
              id: "clicks",
              icon: CursorRays,
              value: totalEvents?.clicks,
              label: trackConversion ? undefined : "clicks",
            },
            ...(trackConversion
              ? [
                  {
                    id: "leads",
                    icon: Crosshairs,
                    value: totalEvents?.leads,
                    className: "hidden sm:flex",
                  },
                  {
                    id: "sales",
                    icon: InvoiceDollar,
                    value: totalEvents?.sales,
                    className: "hidden sm:flex",
                  },
                ]
              : []),
          ].map(({ id, icon: Icon, value, className, label }) => (
            <Link
              key={id}
              href={`/${slug}/analytics?domain=${domain}&key=${key}&tab=${id}`}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 transition-colors",
                variant === "loose" ? "hover:bg-gray-100" : "hover:bg-white",
                className,
              )}
              onPointerEnter={() => setHoveredId(id)}
              onPointerLeave={() =>
                setHoveredId((i) => (i === id ? "clicks" : i))
              }
            >
              <Icon className="text-gray-6000 h-4 w-4 shrink-0" />
              <span>
                {nFormatter(value)}
                {label && (
                  <span className="hidden md:inline-block">&nbsp;{label}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Tooltip>
  );
}
