import { fetcher, getFirstAndLastDay } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { UsageResponse } from "../types";
import useWorkspace from "./use-workspace";

export default function useUsage() {
  const { id: workspaceId, billingCycleStart, totalLinks } = useWorkspace();
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart ?? 0);
  const searchParams = useSearchParams();

  const defaultActiveTab = useMemo(() => {
    if (totalLinks && totalLinks > 10_000) {
      return "links";
    }
    return "events";
  }, [totalLinks]);

  const activeResource =
    searchParams.get("tab") === "links" ? "links" : defaultActiveTab;

  // Get filter parameters from URL
  const folderId = searchParams.get("folderId");
  const domain = searchParams.get("domain");

  const {
    data: usage,
    error,
    isValidating,
  } = useSWR<UsageResponse[]>(
    workspaceId &&
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
    loading: !usage && !error,
    isValidating,
  };
}
