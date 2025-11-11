import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { FraudEventProps } from "../types";
import { fraudEventListQuerySchema } from "../zod/schemas/fraud";
import useWorkspace from "./use-workspace";

const partialQuerySchema = fraudEventListQuerySchema.partial();

export function useFraudEvents(
  {
    query,
    enabled = true,
  }: {
    query?: z.infer<typeof partialQuerySchema>;
    enabled?: boolean;
  } = {},
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<FraudEventProps[]>(
    enabled && workspaceId
      ? `/api/fraud-events?${new URLSearchParams(
          Object.fromEntries(
            Object.entries({
              workspaceId: workspaceId,
              ...query,
            }).filter(([_, value]) => value !== undefined && value !== null),
          ) as Record<string, string>,
        ).toString()}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOptions,
    },
  );

  return {
    fraudEvents: data,
    loading: isLoading,
    error,
  };
}
