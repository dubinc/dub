import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "../../swr/use-workspace";
import { PartnerReferralStats } from "../types";

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
