import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useCampaign() {
  const { id: workspaceId } = useWorkspace();
  const { campaignId } = useParams<{ campaignId: string }>();

  const { data: campaign, error } = useSWR<Campaign>(
    workspaceId && campaignId
      ? `/api/campaigns/${campaignId}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    campaign,
    loading: !campaign && !error,
    error,
  };
}
