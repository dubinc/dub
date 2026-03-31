import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import useWorkspace from "./use-workspace";

export default function usePartnerNetworkInvitesUsage({
  enabled,
  swrOpts,
}: {
  enabled?: boolean;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<{
    usage: number;
    limit: number;
    remaining: number;
  }>(
    workspaceId &&
      enabled !== false &&
      `/api/network/partners/invites-usage?workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    ...data,
    isLoading,
    error,
  };
}
