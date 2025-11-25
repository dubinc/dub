import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useRawFraudEvents<T = unknown>() {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();

  const groupKey = searchParams.get("groupKey");

  const queryString = getQueryString({
    workspaceId,
  });

  const { data, error } = useSWR<T[]>(
    workspaceId && groupKey ? `/api/fraud/events/raw${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents: data,
    loading: !data && !error,
    error,
  };
}
