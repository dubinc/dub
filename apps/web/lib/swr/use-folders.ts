import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { FolderWithRole } from "../link-folder/types";
import useWorkspace from "./use-workspace";

export default function useFolders() {
  const { id } = useWorkspace();

  const {
    data: folders,
    isValidating,
    isLoading,
  } = useSWR<FolderWithRole[]>(
    id && `/api/folders?workspaceId=${id}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    folders,
    isLoading,
    isValidating,
  };
}
