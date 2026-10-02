import { fetcher, getBillingPeriodBounds } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { MEGA_WORKSPACE_LINKS_LIMIT } from "../constants/misc";
import useWorkspace from "./use-workspace";

export type UsageResource = "links" | "events" | "payouts";

export function useUsageTimeseries({
  resource: definedResource,
}: { resource?: UsageResource } = {}) {
  const {
    id: workspaceId,
    billingCycleStart,
    billingCycleEndsAt,
    planPeriod,
    totalLinks,
    defaultProgramId,
    loading: workspaceLoading,
  } = useWorkspace();

  const { start: firstDay, end: lastDay } = getBillingPeriodBounds({
    planPeriod,
    billingCycleStart: billingCycleStart ?? 0,
    billingCycleEndsAt,
  });

  const searchParams = useSearchParams();

  const availableResources = useMemo<UsageResource[]>(
    () =>
      defaultProgramId || workspaceLoading
        ? ["links", "events", "payouts"]
        : ["links", "events"],
    [defaultProgramId, workspaceLoading],
  );

  const defaultActiveTab = useMemo((): UsageResource => {
    if (totalLinks && totalLinks > MEGA_WORKSPACE_LINKS_LIMIT) {
      return "links";
    }
    return "events";
  }, [totalLinks]);

  const activeResource = useMemo(() => {
    const tab = searchParams.get("tab");
    if (tab && availableResources.includes(tab as UsageResource)) {
      return tab as UsageResource;
    }
    return defaultActiveTab;
  }, [searchParams, availableResources, defaultActiveTab]);

  const resource = definedResource || activeResource;
  const isLinkResource = resource !== "payouts";

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

  const groupBy: "domain" | "folderId" =
    (["domain", "folderId"] as const).find(
      (gb) => gb === searchParams.get("groupBy"),
    ) ?? "domain";

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
        resource,
        ...(start &&
          end && {
            start: startOfDay(new Date(start)).toISOString(),
            end: endOfDay(new Date(end)).toISOString(),
          }),
        ...(interval && { interval }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(isLinkResource && {
          ...(folderId && { folderId }),
          ...(domain && { domain }),
          ...(groupBy && {
            groupBy: groupBy === "folderId" ? "folder_id" : "domain",
          }),
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
