import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useFoldersCount() {
  const { id } = useWorkspace();

  const { data, error } = useSWR<number>(
    id &&
      `/api/folders/count?${new URLSearchParams({ workspaceId: id }).toString()}`,
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
