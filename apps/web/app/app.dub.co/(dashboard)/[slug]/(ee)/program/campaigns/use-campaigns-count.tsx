import useWorkspace from "@/lib/swr/use-workspace";
import { getCampaignsCountQuerySchema } from "@/lib/zod/schemas/campaigns";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";

interface UseCampaignsCountProps
  extends z.infer<typeof getCampaignsCountQuerySchema> {
  exclude?: string[];
}

export default function useCampaignsCount<T>({
  exclude,
  ...params
}: UseCampaignsCountProps = {}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString(
    {
      ...params,
      workspaceId,
    },
    {
      exclude: exclude || [],
    },
  );

  const { data: campaignsCount, error } = useSWR(
    defaultProgramId ? `/api/campaigns/count${queryString}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    campaignsCount: campaignsCount as T,
    loading: !error && campaignsCount === undefined,
    error,
  };
}
