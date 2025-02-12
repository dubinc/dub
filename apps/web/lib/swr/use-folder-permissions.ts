import { FolderPermission, FolderWithPermissions } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useFolderPermissions() {
  const { id, plan, flags } = useWorkspace();

  const { data, error, isLoading, mutate } = useSWR<FolderWithPermissions[]>(
    id && flags?.linkFolders && plan !== "free" && plan !== "pro"
      ? `/api/folders/permissions?workspaceId=${id}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    folders: data,
    error,
    isLoading,
    mutate,
  };
}

export function useCheckFolderPermission(
  folderId: string | null,
  action: FolderPermission,
) {
  const { folders, isLoading } = useFolderPermissions();

  // if (isLoading) {
  //   return false;
  // }

  if (!folderId) {
    return true;
  }

  if (!folders || !Array.isArray(folders)) {
    return false;
  }

  const folder = folders.find((folder) => folder.id === folderId);

  if (!folder) {
    return false;
  }

  return folder.permissions.includes(action);
}
