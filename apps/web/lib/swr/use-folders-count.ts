import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useFoldersCount({
  includeParams = [],
  query,
}: {
  includeParams?: string[];
  query?: Record<string, any>;
} = {}) {
  const { id: workspaceId, plan } = useWorkspace();

  const { getQueryString } = useRouterStuff();

  const qs = getQueryString(
    { workspaceId, ...query },
    { include: includeParams },
  );

  const { data, error } = useSWR<number>(
    workspaceId && plan !== "free" ? `/api/folders/count${qs}` : null,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    loading: !error && data === undefined,
    error,
  };
}
