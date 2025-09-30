import useWorkspace from "@/lib/swr/use-workspace";
import { getCampaignsCountQuerySchema } from "@/lib/zod/schemas/campaigns";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";

export default function useCampaignsCount<T>({
  ignoreParams,
  enabled,
  ...params
}: z.infer<typeof getCampaignsCountQuerySchema> & {
  programId?: string;
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = ignoreParams
    ? // @ts-ignore
      `?${new URLSearchParams({
        ...(params.groupBy && { groupBy: params.groupBy }),
        ...(params.status && { status: params.status }),
        workspaceId,
      }).toString()}`
    : getQueryString({
        ...params,
        workspaceId,
      });

  const { data: campaignsCount, error } = useSWR(
    enabled !== false && defaultProgramId
      ? `/api/campaigns/count${queryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    campaignsCount: campaignsCount as T,
    error,
    loading: enabled !== false && !error && campaignsCount === undefined,
  };
}
