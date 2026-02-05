import useWorkspace from "@/lib/swr/use-workspace";
import { getActivityLogsQuerySchema } from "@/lib/zod/schemas/activity-log";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { ActivityLog } from "../types";

export function useActivityLogs({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof getActivityLogsQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const searchParams = query
    ? new URLSearchParams({
        workspaceId: workspaceId!,
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
