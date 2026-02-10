import { ActivityLog, GetActivityLogsQuery } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function usePartnerActivityLogs({
  query,
  enabled = true,
}: {
  query?: GetActivityLogsQuery;
  enabled?: boolean;
} = {}) {
  const { programSlug } = useParams<{ programSlug: string }>();

  const searchParams = query
    ? new URLSearchParams({
        ...query,
      }).toString()
    : "";

  const { data, error, isLoading, mutate } = useSWR<ActivityLog[]>(
    enabled &&
      programSlug &&
      query?.resourceType &&
      query?.resourceId &&
      `/api/partner-profile/programs/${programSlug}/activity-logs?${searchParams}`,
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
