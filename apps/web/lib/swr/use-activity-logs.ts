import useWorkspace from "@/lib/swr/use-workspace";
import { ActivityLog, GetActivityLogsQuery } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export function useActivityLogs({
  query,
  enabled = true,
}: {
  query?: GetActivityLogsQuery;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const searchParams = query
    ? new URLSearchParams({
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        ...(query.action && { action: query.action }),
      }).toString()
    : "";
  const { data, error, isLoading, mutate } = useSWR<ActivityLog[]>(
    enabled &&
      workspaceId &&
      query?.resourceType &&
      query?.resourceId &&
      `/api/activity-logs?${searchParams}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );
  return {
    activityLogs: data,
    error,
    loading: isLoading,
    mutate,
  };
}
