import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useFraudEvents<T = unknown>() {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();

  const groupId = searchParams.get("groupId");

  const queryString = getQueryString({
    workspaceId,
  });

  const { data, error } = useSWR<T[]>(
    workspaceId && groupId ? `/api/fraud/events${queryString}` : undefined,
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
