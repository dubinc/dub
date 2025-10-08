import { FolderUser } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { getPlanCapabilities } from "../plan-capabilities";
import useWorkspace from "./use-workspace";

export function useFolderUsers(
  {
    folderId,
    enabled = true,
  }: {
    folderId?: string | null;
    enabled?: boolean;
  },
  swrOpts?: SWRConfiguration,
) {
  const { id: workspaceId, plan } = useWorkspace();
  const { canManageFolderPermissions } = getPlanCapabilities(plan);

  const {
    data: users,
    isValidating,
    isLoading,
  } = useSWR<FolderUser[]>(
    enabled &&
      workspaceId &&
      canManageFolderPermissions &&
      folderId &&
      folderId !== "unsorted"
      ? `/api/folders/${folderId}/users?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    users,
    isValidating,
    isLoading,
  };
}
