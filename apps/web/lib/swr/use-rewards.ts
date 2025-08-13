import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { RewardProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useRewards() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data: rewards, error } = useSWR<RewardProps[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/rewards?workspaceId=${workspaceId}`,
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
