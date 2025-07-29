import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useFraudEventsCount(opts?: Record<string, any>) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data: fraudEventsCount, error } = useSWR(
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
    error,
  };
}
