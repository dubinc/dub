import { getRewardsQuerySchema } from "@/lib/api/rewards/list-rewards";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { RewardProps } from "../types";
import useWorkspace from "./use-workspace";

export type RewardListItem = RewardProps & {
  groupId?: string | null;
  partnersCount?: number;
};

export function useRewards(
  opts: z.infer<typeof getRewardsQuerySchema> = {},
  swrOpts: SWRConfiguration = {},
) {
  const { groupId } = opts;
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const searchParams = new URLSearchParams({
    ...(workspaceId && { workspaceId }),
    ...(groupId && { groupId }),
  });

  const requiresGroup = "groupId" in opts;
  const canFetch =
    workspaceId && defaultProgramId && (!requiresGroup || groupId);

  const { data: rewards, error } = useSWR<RewardListItem[]>(
    canFetch ? `/api/rewards?${searchParams}` : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: !groupId,
      ...swrOpts,
    },
  );

  return {
    rewards,
    loading: !rewards && !error,
    error,
  };
}
