import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useFraudEventsCount<T>(opts?: Record<string, any>) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const {
    data: fraudEventsCount,
    error,
    isLoading: loading,
  } = useSWR<T>(
    `/api/fraud-events/count${getQueryString(
      {
        workspaceId,
      },
      {
        ...opts,
        exclude: opts?.exclude || [],
      },
    )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEventsCount,
    loading,
    error,
  };
}
