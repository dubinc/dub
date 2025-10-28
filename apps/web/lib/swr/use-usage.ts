import { fetcher, getFirstAndLastDay } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { UsageResponse } from "../types";
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
      return tab;
    }
    return defaultActiveTab;
  }, [searchParams, defaultActiveTab]);

  // Get filter parameters from URL
  const folderId = searchParams.get("folderId");
  const domain = searchParams.get("domain");
  const hasActiveFilters = folderId || domain ? true : false;

  const {
    data: usage,
    error,
    isValidating,
  } = useSWR<UsageResponse[]>(
    workspaceId &&
      (disabledWhenNoFilters ? hasActiveFilters : true) &&
      `/api/workspaces/${workspaceId}/billing/usage?${new URLSearchParams({
        resource: activeResource,
        start: firstDay.toISOString().replace("T", " ").replace("Z", ""),
        // get end of the day (11:59:59 PM)
        end: new Date(lastDay.getTime() + 86399999)
          .toISOString()
          .replace("T", " ")
          .replace("Z", ""),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(folderId && { folderId }),
        ...(domain && { domain }),
        ...(disabledWhenNoFilters &&
          hasActiveFilters && { cacheKey: "disabledWhenNoFilters" }),
      }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    usage,
    activeResource,
    hasActiveFilters,
    loading: !usage && !error,
    isValidating,
  };
}
