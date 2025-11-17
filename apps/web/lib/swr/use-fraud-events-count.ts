import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export function useFraudEventsCount<T>() {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString(
    {
      workspaceId,
    },
    {
      exclude: ["page", "pageSize", "sortBy", "sortOrder"],
    },
  );

  const { data: fraudEventsCount, error } = useSWR(
    defaultProgramId ? `/api/fraud-events/count${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEventsCount: fraudEventsCount as T,
    loading: !error && fraudEventsCount === undefined,
    error,
  };
}
