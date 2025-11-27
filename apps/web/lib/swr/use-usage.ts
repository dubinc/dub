import { fetcher, getFirstAndLastDay } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

// here we're using disabledWhenNoFilters for the special case where we need to
// fetch the total links usage conditionally only if there are active filters (folderId or domain)
// if not we need to fallback to the workspace.linksUsage value
// TODO: Improve this since it's a bit hacky right now
export default function useUsage({
  disabledWhenNoFilters = false,
}: { disabledWhenNoFilters?: boolean } = {}) {
  const { id: workspaceId, billingCycleStart, totalLinks } = useWorkspace();
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart ?? 0);
  const searchParams = useSearchParams();

  const defaultActiveTab = useMemo(() => {
    if (totalLinks && totalLinks > 10_000) {
      return "links";
    }
    return "events";
  }, [totalLinks]);

  const activeResource = useMemo(() => {
    const tab = searchParams.get("tab");
    if (tab && ["links", "events"].includes(tab)) {
      return tab as "links" | "events";
    }
    return defaultActiveTab;
  }, [searchParams, defaultActiveTab]);

  // Get filter parameters from URL
  const folderId = searchParams.get("folderId");
  const domain = searchParams.get("domain");
  const hasActiveFilters = folderId || domain ? true : false;

  const { start, end, interval } = useMemo(() => {
    if (searchParams.has("interval"))
      return {
        interval: searchParams.get("interval") || "30d",
        start: undefined,
        end: undefined,
      };

    return {
      start: searchParams.get("start") || firstDay.toISOString(),
      end: searchParams.get("end") || lastDay.toISOString(),
      interval: undefined,
    };
  }, [searchParams, firstDay, lastDay]);

  const groupBy: "folderId" | "domain" =
    (["folderId", "domain"] as const).find(
      (gb) => gb === searchParams.get("groupBy"),
    ) ?? "folderId";

  const {
    data: usage,
    error,
    isValidating,
  } = useSWR<
    {
      date: string;
      value: number;
      groups: { id: string; name: string; usage: number }[];
    }[]
  >(
    workspaceId &&
      (disabledWhenNoFilters ? hasActiveFilters : true) &&
      `/api/workspaces/${workspaceId}/billing/usage?${new URLSearchParams({
        resource: activeResource,
        ...(start &&
          end && {
            start: startOfDay(new Date(start)).toISOString(),
            end: endOfDay(new Date(end)).toISOString(),
          }),
        ...(interval && { interval }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(folderId && { folderId }),
        ...(domain && { domain }),
        ...(groupBy && {
          groupBy: groupBy === "folderId" ? "folder_id" : "domain",
        }),
        ...(disabledWhenNoFilters &&
          hasActiveFilters && { cacheKey: "disabledWhenNoFilters" }),
      }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  return {
    usage,
    activeResource,
    hasActiveFilters,
    start,
    end,
    interval,
    groupBy,
    loading: !usage && !error,
    isValidating,
  };
}
