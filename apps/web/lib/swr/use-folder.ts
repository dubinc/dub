import { Folder } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useFolder({ folderId }: { folderId?: string | null }) {
  const { id: workspaceId, plan, flags } = useWorkspace();

  const {
    data: folder,
    isValidating,
    isLoading,
  } = useSWR<Folder>(
    folderId && workspaceId && flags?.linkFolders && plan !== "free"
      ? `/api/folders/${folderId}?workspaceId=${workspaceId}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    folder,
    loading: isLoading,
    isValidating,
  };
}
