import {
  DUB_LINKS_ANALYTICS_INTERVAL,
  EVENT_TYPES,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import { EventType } from "@/lib/analytics/types";
import { combineTagIds } from "@/lib/api/tags/combine-tag-ids";
import useWorkspace from "@/lib/swr/use-workspace";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useAnalyticsQuery({
  defaultEvent = "clicks",
  domain: domainParam,
  defaultKey,
  defaultInterval = DUB_LINKS_ANALYTICS_INTERVAL,
  defaultRoot,
}: {
  defaultEvent?: EventType;
  domain?: string;
  defaultKey?: string;
  defaultInterval?: string;
  defaultRoot?: (props: {
    key?: string;
    folderId?: string;
    tagIds?: string;
  }) => boolean | string | undefined;
} = {}) {
  const searchParams = useSearchParams();
  const { id: workspaceId } = useWorkspace();

  const domain = domainParam ?? searchParams?.get("domain");
  // key can be a query param (stats pages in app) or passed as a staticKey (shared analytics dashboards)
  const key = searchParams?.get("key") || defaultKey;

  const tagIds = combineTagIds({
    tagId: searchParams?.get("tagId"),
    tagIds: searchParams?.get("tagIds")?.split(","),
  })?.join(",");

  const folderId = searchParams?.get("folderId") ?? undefined;

  const customerId = searchParams?.get("customerId") ?? undefined;

  // Default to last 24 hours
  const { start, end } = useMemo(() => {
    const hasRange = searchParams?.has("start") && searchParams?.has("end");

    return {
      start: hasRange
        ? startOfDay(
            new Date(searchParams?.get("start") || subDays(new Date(), 1)),
          )
        : undefined,

      end: hasRange
        ? endOfDay(new Date(searchParams?.get("end") || new Date()))
        : undefined,
    };
  }, [searchParams?.get("start"), searchParams?.get("end")]);

  // Only set interval if start and end are not provided
  const interval =
    start || end ? undefined : searchParams?.get("interval") ?? defaultInterval;

  const root = searchParams.get("root")
    ? searchParams.get("root") === "true"
    : defaultRoot
      ? defaultRoot({ key, folderId, tagIds })
      : "false";

  const selectedTab: EventType = useMemo(() => {
    const event = searchParams.get("event");

    return EVENT_TYPES.find((t) => t === event) ?? defaultEvent;
  }, [searchParams.get("event"), defaultEvent]);

  const queryString = useMemo(() => {
    const availableFilterParams = VALID_ANALYTICS_FILTERS.reduce(
      (acc, filter) => ({
        ...acc,
        ...(searchParams?.get(filter) && {
          [filter]: searchParams.get(filter),
        }),
      }),
      {},
    );
    return new URLSearchParams({
      ...availableFilterParams,
      ...(workspaceId && { workspaceId }),
      ...(domain && { domain }),
      ...(key && { key }),
      ...(start &&
        end && { start: start.toISOString(), end: end.toISOString() }),
      ...(interval && { interval }),
      ...(tagIds && { tagIds }),
      ...(root && { root: root.toString() }),
      event: selectedTab,
      ...(folderId && { folderId }),
      ...(customerId && { customerId }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).toString();
  }, [
    searchParams,
    workspaceId,
    domain,
    key,
    start,
    end,
    interval,
    tagIds,
    root,
    selectedTab,
    folderId,
    customerId,
  ]);

  return {
    queryString,
    domain,
    key,
    start,
    end,
    interval,
    tagIds,
    root,
    selectedTab,
    folderId,
    customerId,
  };
}
