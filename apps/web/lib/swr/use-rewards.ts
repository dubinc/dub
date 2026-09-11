import { buildSearchParams, fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { RewardProps } from "../types";
import { getRewardsQuerySchema } from "../zod/schemas/rewards";
import useWorkspace from "./use-workspace";

export function useRewards({
  groupId,
}: z.infer<typeof getRewardsQuerySchema> = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const searchParams = buildSearchParams({
    workspaceId,
    groupId,
  });

  const { data: rewards, error } = useSWR<RewardProps[]>(
    workspaceId && defaultProgramId && `/api/rewards?${searchParams}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    rewards,
    loading: !rewards && !error,
    error,
  };
}
