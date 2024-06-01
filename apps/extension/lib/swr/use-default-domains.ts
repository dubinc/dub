import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useDefaultDomains() {
  const { id } = useWorkspace();

  const { data, error, mutate } = useSWR<string[]>(
    id && `/api/domains/default?workspaceId=${id}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    defaultDomains: data,
    loading: !data && !error,
    mutate,
    error,
  };
}
