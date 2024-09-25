import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { Folder } from "../link-folder/types";
import useWorkspace from "./use-workspace";

export default function useFolders({
  includeParams = false,
}: {
  includeParams?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const qs = includeParams
    ? getQueryString({ workspaceId })
    : `?workspaceId=${workspaceId}`;

  const {
    data: folders,
    isValidating,
    isLoading,
  } = useSWR<Folder[]>(workspaceId ? `/api/folders${qs}` : null, fetcher, {
    dedupingInterval: 60000,
  });

  return {
    folders,
    isLoading,
    isValidating,
  };
}
