import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { BountyStats } from "../types";
import useWorkspace from "./use-workspace";

export default function useBountiesStats({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: bountiesStats,
    error,
    isLoading,
  } = useSWR<BountyStats[]>(
    enabled && workspaceId
      ? `/api/bounties/stats?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    bountiesStats,
    isLoading,
    error,
  };
}
