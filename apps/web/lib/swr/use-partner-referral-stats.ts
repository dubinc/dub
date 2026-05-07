import { partnerReferralStatsSchema } from "@/lib/zod/schemas/partners";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import useWorkspace from "./use-workspace";

type PartnerReferralStats = z.infer<typeof partnerReferralStatsSchema>;

export function usePartnerReferralStats({
  partnerId,
}: {
  partnerId: string | null | undefined;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<PartnerReferralStats>(
    partnerId && workspaceId
      ? `/api/partners/${partnerId}/referral-stats?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return {
    referralStats: data,
    loading: isLoading,
    error,
  };
}
