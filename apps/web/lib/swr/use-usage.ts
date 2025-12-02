import { fetcher, getFirstAndLastDay } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { MEGA_WORKSPACE_LINKS_LIMIT } from "../constants/misc";
import useWorkspace from "./use-workspace";

export default function useUsage({
  resource: definedResource,
}: { resource?: "links" | "events" } = {}) {
  const { id: workspaceId, billingCycleStart, totalLinks } = useWorkspace();
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart ?? 0);
  const searchParams = useSearchParams();

  const defaultActiveTab = useMemo(() => {
    if (totalLinks && totalLinks > MEGA_WORKSPACE_LINKS_LIMIT) {
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
      `/api/workspaces/${workspaceId}/billing/usage?${new URLSearchParams({
        resource: definedResource || activeResource,
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
      }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    },
  );

  return {
    usage,
    activeResource,
    start,
    end,
    interval,
    groupBy,
    loading: !usage && !error,
    isValidating,
  };
}
