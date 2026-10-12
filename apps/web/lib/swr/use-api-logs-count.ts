import { apiLogCountRowSchemas } from "@/lib/api-logs/schemas";
import type { ApiLogsCountGroupBy, ApiLogsCountRow } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import useWorkspace from "./use-workspace";

type ApiLogsCountDataMap = {
  [K in ApiLogsCountGroupBy]: z.infer<(typeof apiLogCountRowSchemas)[K]>[];
};

// Overloads so `data` is typed from `groupBy` (implementation is the last signature)
export function useApiLogsCount(options?: {
  groupBy?: undefined;
  enabled?: boolean;
}): {
  data: ApiLogsCountRow[] | undefined;
  error: any;
  isLoading: boolean;
};

export function useApiLogsCount<T extends ApiLogsCountGroupBy>(options: {
  groupBy: T;
  enabled?: boolean;
}): {
  data: ApiLogsCountDataMap[T] | undefined;
  error: any;
  isLoading: boolean;
};

export function useApiLogsCount({
  groupBy,
  enabled = true,
}: {
  groupBy?: ApiLogsCountGroupBy;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = getQueryString(
    {
      workspaceId,
      ...(groupBy && { groupBy }),
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

  const { data, error } = useSWR(
    workspaceId && enabled ? `/api/logs/count${queryString}` : null,
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
