import { CompositeAnalyticsResponseOptions } from "@/lib/analytics/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { Crosshairs, useIntersectionObserver } from "@dub/ui";
import { CursorRays, InvoiceDollar } from "@dub/ui/src/icons";
import { fetcher, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import useSWR from "swr";
import { ResponseLink } from "./links-container";
import TagBadge from "./tag-badge";

export function LinkDetailsColumn({
  link: { id, domain, key, tags, trackConversion, ...link },
}: {
  link: ResponseLink;
}) {
  const { primaryTags, additionalTags } = useOrganizedTags(tags);

  const { id: workspaceId, slug, exceededClicks } = useWorkspace();

  const ref = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(ref, {});
  const isVisible = !!entry?.isIntersecting;

  const { data: totalEvents } = useSWR<{
    [key in CompositeAnalyticsResponseOptions]?: number;
  }>(
    // Only fetch data if the link is visible and there's a slug and the usage is not exceeded
    isVisible &&
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

  return (
    <div ref={ref} className="flex items-center justify-end gap-5">
      <div className="flex items-center gap-2">
        {primaryTags.map((tag) => (
          <TagBadge key={tag.id} {...tag} />
        ))}
      </div>
      <Link
        href={`/${slug}/analytics?domain=${domain}&key=${key}`}
        className="flex items-center gap-3 rounded-md bg-gray-100 px-2 py-0.5 text-sm text-gray-950 transition-colors hover:bg-gray-200"
      >
        {[
          { id: "clicks", icon: CursorRays, value: totalEvents?.clicks },
          ...(trackConversion
            ? [
                { id: "sales", icon: Crosshairs, value: totalEvents?.sales },
                { id: "leads", icon: InvoiceDollar, value: totalEvents?.leads },
              ]
            : []),
        ].map(({ id, icon: Icon, value }) => (
          <div key={id} className="flex items-center gap-1">
            <Icon className="h-4 w-4 text-gray-600" />
            {nFormatter(totalEvents?.clicks)}
          </div>
        ))}
      </Link>
    </div>
  );
}

function useOrganizedTags(tags: ResponseLink["tags"]) {
  const searchParams = useSearchParams();

  const [primaryTags, additionalTags] = useMemo(() => {
    const primaryTagsCount = 1;

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

    return [
      sortedTags.filter((_, idx) => idx < primaryTagsCount),
      sortedTags.filter((_, idx) => idx >= primaryTagsCount),
    ];
  }, [tags, searchParams]);

  return { primaryTags, additionalTags };
}
