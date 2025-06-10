import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { PartnersCount } from "../types";
import { partnersCountQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

export default function usePartnersCount<T>({
  ignoreParams,
  enabled,
  ...params
}: z.infer<typeof partnersCountQuerySchema> & {
  programId?: string;
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = ignoreParams
    ? // @ts-ignore
      `?${new URLSearchParams({
        ...(params.groupBy && { groupBy: params.groupBy }),
        workspaceId,
      }).toString()}`
    : getQueryString(
        {
          ...params,
          workspaceId,
        },
        {
          exclude: ["partnerId"],
        },
      );

  const { data: partnersCount, error } = useSWR<PartnersCount>(
    enabled !== false ? `/api/partners/count${queryString}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    partnersCount: partnersCount as T,
    error,
    loading: !error && partnersCount === undefined,
  };
}
