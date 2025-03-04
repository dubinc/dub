import { RewardfulCampaign } from "@/lib/rewardful/types";
import { fetcher } from "@dub/utils/src";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export const useRewardfulCampaigns = ({
  enabled = false,
}: {
  enabled: boolean;
}) => {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<RewardfulCampaign[]>(
    enabled && workspaceId
      ? `/api/programs/rewardful/campaigns?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return {
    campaigns: data,
    loading: !data && !error && enabled,
    error,
  };
};
