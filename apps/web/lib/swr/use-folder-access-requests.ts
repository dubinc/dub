import { fetcher } from "@dub/utils";
import { FolderAccessRequest } from "@prisma/client";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useFolderAccessRequests() {
  const { id } = useWorkspace();

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    FolderAccessRequest[]
  >(id && `/api/folders/access-requests?workspaceId=${id}`, fetcher, {
    dedupingInterval: 60000,
  });

  return {
    accessRequests: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
