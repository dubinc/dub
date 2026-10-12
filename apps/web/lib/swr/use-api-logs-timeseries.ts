import type { ApiLogsTimeseriesRow } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useApiLogsTimeseries() {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = getQueryString(
    {
      workspaceId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    {
      include: [
        "method",
        "statusCode",
        "routePattern",
        "tokenId",
        "requestId",
        "requestType",
        "start",
        "end",
        "interval",
        "exactRange",
      ],
    },
  );

  const { data, error, isLoading } = useSWR<ApiLogsTimeseriesRow[]>(
    workspaceId ? `/api/logs/timeseries${queryString}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    isLoading: isLoading || (!error && data === undefined),
  };
}
