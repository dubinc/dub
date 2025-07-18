import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { EnrolledPartnerProps } from "../types";
import useWorkspace from "./use-workspace";

export default function usePartner(
  {
    partnerId,
  }: {
    partnerId: string | null;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<EnrolledPartnerProps>(
    partnerId && workspaceId
      ? `/api/partners/${partnerId}?${new URLSearchParams({
          workspaceId,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
    swrOptions,
  );

  return {
    partner: data,
    loading: isLoading,
    error,
  };
}
