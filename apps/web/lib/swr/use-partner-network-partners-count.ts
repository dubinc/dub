import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { getPartnerNetworkPartnersCountQuerySchema } from "../zod/schemas/partner-network";
import useWorkspace from "./use-workspace";

export default function usePartnerNetworkPartnersCount<
  T = { discover: number; invited: number; recruited: number },
>({
  query,
  enabled,
  ignoreParams,
  excludeParams = [],
  swrOpts,
}: {
  query?: Partial<z.infer<typeof getPartnerNetworkPartnersCountQuerySchema>>;
  enabled?: boolean;
  ignoreParams?: boolean;
  excludeParams?: string[];
  swrOpts?: SWRConfiguration;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<T>(
    workspaceId &&
      enabled !== false &&
      `/api/network/partners/count${
        ignoreParams
          ? `?${new URLSearchParams({ workspaceId, ...(query as any) }).toString()}`
          : getQueryString(
              {
                workspaceId,
                ...query,
              },
              {
                exclude: ["page", "tab", ...excludeParams],
              },
            )
      }`,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    data,
    isLoading,
    error,
  };
}
