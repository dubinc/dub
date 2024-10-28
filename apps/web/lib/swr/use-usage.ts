import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { UsageResponse } from "../types";
import useWorkspace from "./use-workspace";

export default function useUsage({
  resource,
}: {
  resource: "links" | "events" | "revenue";
}) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: usage,
    error,
    isValidating,
  } = useSWR<UsageResponse[]>(
    workspaceId &&
      `/api/workspaces/${workspaceId}/billing/usage?${new URLSearchParams({
        resource,
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
