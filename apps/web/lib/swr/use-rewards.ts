import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { RewardProp } from "../types";
import useWorkspace from "./use-workspace";

export default function useRewards() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: rewards, error } = useSWR<RewardProp[]>(
    programId &&
      workspaceId &&
      `/api/programs/${programId}/rewards?workspaceId=${workspaceId}`,
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
