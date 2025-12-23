import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { getNetworkProgramsCountQuerySchema } from "../zod/schemas/program-network";
import useWorkspace from "./use-workspace";

export default function useNetworkProgramsCount<T = number>({
  query,
  enabled,
  ignoreParams,
  excludeParams = [],
  swrOpts,
}: {
  query?: Partial<z.infer<typeof getNetworkProgramsCountQuerySchema>>;
  enabled?: boolean;
  ignoreParams?: boolean;
  excludeParams?: string[];
  swrOpts?: SWRConfiguration;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<T>(
    enabled !== false &&
      `/api/network/programs/count${
        ignoreParams
          ? `?${new URLSearchParams({ workspaceId, ...(query && (query as any)) }).toString()}`
          : getQueryString(query, {
              exclude: ["page", ...excludeParams],
            })
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
