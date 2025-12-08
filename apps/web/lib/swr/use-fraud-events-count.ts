import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export function useFraudEventsCount({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();

  const groupId = searchParams.get("groupId");

  const queryString = getQueryString({
    workspaceId,
  });

  const { data, error } = useSWR<number>(
    workspaceId && groupId && enabled
      ? `/api/fraud/events/count${queryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEventsCount: data,
    loading: !error && data === undefined,
    error,
  };
}
