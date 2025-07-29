import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { FraudEvent } from "../types";
import { getFraudEventsQuerySchema } from "../zod/schemas/fraud-events";
import useWorkspace from "./use-workspace";

const querySchema = getFraudEventsQuerySchema.partial();

export function useFraudEvents(
  {
    query,
    enabled = true,
  }: {
    query?: z.infer<typeof querySchema>;
    enabled?: boolean;
  } = {},
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: fraudEvents,
    isLoading: loading,
    error,
  } = useSWR<FraudEvent[]>(
    enabled && workspaceId
      ? `/api/fraud-events?${new URLSearchParams({
          ...query,
          workspaceId: workspaceId,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
    swrOptions,
  );

  return {
    fraudEvents,
    loading,
    error,
  };
}
