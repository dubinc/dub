import { Folder } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import useWorkspace from "./use-workspace";

export default function useFolders({
  includeParams = false,
  includeLinkCount = false,
  query,
  options,
}: {
  includeParams?: boolean;
  includeLinkCount?: boolean;
  query?: Record<string, any>;
  options?: SWRConfiguration;
} = {}) {
  const { id: workspaceId, plan, flags } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const qs = getQueryString(
    { workspaceId, ...query },
    { include: includeParams ? undefined : [] },
  );

  const {
    data: folders,
    isValidating,
    isLoading,
  } = useSWR<Folder[]>(
    workspaceId && flags?.linkFolders && plan !== "free"
      ? `/api/folders${qs}${includeLinkCount ? "&includeLinkCount=true" : ""}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
      ...options,
    },
  );

  return {
    folders,
    loading: isLoading,
    isValidating,
  };
}
