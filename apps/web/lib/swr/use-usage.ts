import { fetcher, getFirstAndLastDay } from "@dub/utils";
import useSWR from "swr";
import { UsageResponse } from "../types";
import useWorkspace from "./use-workspace";

export default function useUsage({
  resource,
}: {
  resource: "links" | "events" | "revenue";
}) {
  const { id: workspaceId, billingCycleStart } = useWorkspace();
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart ?? 0);

  const {
    data: usage,
    error,
    isValidating,
  } = useSWR<UsageResponse[]>(
    workspaceId &&
      `/api/workspaces/${workspaceId}/billing/usage?${new URLSearchParams({
        resource,
        start: firstDay.toISOString().replace("T", " ").replace("Z", ""),
        // get end of the day (11:59:59 PM)
        end: new Date(lastDay.getTime() + 86399999)
          .toISOString()
          .replace("T", " ")
          .replace("Z", ""),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    usage,
    loading: !usage && !error,
    isValidating,
  };
}
