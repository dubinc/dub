import { Folder } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useFolders({
  includeParams = false,
}: {
  includeParams?: boolean;
} = {}) {
  const { id: workspaceId, flags } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const qs = includeParams
    ? getQueryString({ workspaceId })
    : `?workspaceId=${workspaceId}`;

  const {
    data: folders,
    isValidating,
    isLoading,
  } = useSWR<Folder[]>(
    workspaceId && flags?.linkFolders ? `/api/folders${qs}` : null,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    folders,
    loading: isLoading,
    isValidating,
  };
}
