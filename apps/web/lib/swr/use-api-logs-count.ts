import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useApiLogsCount<T>({
  groupBy,
  enabled = true,
}: {
  groupBy?: "routePattern";
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = getQueryString(
    {
      workspaceId,
      ...(groupBy && { groupBy }),
    },
    {
      include: [
        "method",
        "statusCode",
        "routePattern",
        "tokenId",
        "requestId",
        "requestType",
      ],
    },
  );

  const { data, error } = useSWR<T>(
    workspaceId && enabled ? `/api/api-logs/count${queryString}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    isLoading: !error && data === undefined,
  };
}
