import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Reward } from "../types";
import useWorkspace from "./use-workspace";

export default function useRewards() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: rewards, error } = useSWR<Reward[]>(
    programId &&
      workspaceId &&
      `/api/programs/${programId}/rewards?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    rewards,
    loading: !rewards && !error,
    error,
  };
}
