import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { fraudEventsCountQuerySchema } from "../zod/schemas/fraud-events";
import useWorkspace from "./use-workspace";

const partialQuerySchema = fraudEventsCountQuerySchema.partial();

export function useFraudEventsCount<T>(
  params: z.infer<typeof partialQuerySchema> & {
    enabled?: boolean;
    exclude?: string[];
  } = {},
) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const {
    data: fraudEventsCount,
    error,
    isLoading: loading,
  } = useSWR<T>(
    params.enabled !== false
      ? `/api/fraud-events/count${getQueryString(
          {
            ...params,
            workspaceId,
          },
          {
            exclude: ["page", ...(params.exclude || [])],
          },
        )}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEventsCount,
    loading,
    error,
  };
}
