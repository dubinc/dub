import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { FraudEventProps } from "../types";
import { fraudEventsQuerySchema } from "../zod/schemas/fraud";
import useWorkspace from "./use-workspace";

export function useFraudEvents(
  filters: Partial<z.infer<typeof fraudEventsQuerySchema>>,
) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString({
    workspaceId,
    ...filters,
  });

  const { data, isLoading, error } = useSWR<FraudEventProps[]>(
    defaultProgramId ? `/api/fraud-events${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents: data,
    loading: isLoading,
    error,
  };
}
