import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useDomainsCount({
  includeParams = true,
  params,
}: {
  includeParams?: boolean;
  params?: Record<string, string>;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<number>(
    workspaceId &&
      `/api/domains/count${
        includeParams
          ? getQueryString({
              workspaceId,
              ...params,
            })
          : "?" + new URLSearchParams({ workspaceId, ...params }).toString()
      }`,
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
