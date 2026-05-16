import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "../../swr/use-workspace";
import { PartnerReferral } from "../types";

export function usePartnerReferral({
  partnerId,
}: {
  partnerId: string | null | undefined;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<PartnerReferral>(
    partnerId && workspaceId
      ? `/api/partners/${partnerId}/referral?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return {
    referral: data,
    loading: isLoading,
    error,
  };
}
