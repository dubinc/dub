import { FraudEvent } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getFraudEventsQuerySchema } from "../zod/schemas/fraud-events";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getFraudEventsQuerySchema.partial();

export function useFraudEvents({
  query,
}: {
  query?: z.infer<typeof partialQuerySchema>;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const {
    data: fraudEvents,
    isLoading: loading,
    error,
  } = useSWR<FraudEvent[]>(
    workspaceId
      ? `/api/fraud-events${getQueryString(
          {
            workspaceId,
            ...query,
          },
          {
            exclude: ["fraudEventId"],
          },
        )}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents,
    loading,
    error,
  };
}
