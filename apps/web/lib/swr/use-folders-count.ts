import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useFoldersCount() {
  const { id, flags } = useWorkspace();

  const { data, error } = useSWR<number>(
    id && flags?.linkFolders
      ? `/api/folders/count?${new URLSearchParams({ workspaceId: id }).toString()}`
      : null,
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
