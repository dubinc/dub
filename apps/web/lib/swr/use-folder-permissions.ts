import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { FolderPermission, FolderWithPermissions } from "../link-folder/types";
import useWorkspace from "./use-workspace";

export function useFolderPermissions() {
  const { id } = useWorkspace();

  const { data, error, isLoading } = useSWR<FolderWithPermissions[]>(
    id && `/api/folders/permissions?workspaceId=${id}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    folders: data,
    error,
    isLoading,
  };
}

export function useCheckFolderPermission(
  action: FolderPermission,
  folderId: string,
) {
  const { folders } = useFolderPermissions();

  if (!folders || !Array.isArray(folders)) {
    return false;
  }

  const folder = folders.find((folder) => folder.id === folderId);

  if (!folder) {
    return false;
  }

  return folder.permissions.includes(action);
}
