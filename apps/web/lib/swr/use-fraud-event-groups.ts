import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { fraudEventGroupProps } from "../types";
import { groupedFraudEventsQuerySchema } from "../zod/schemas/fraud";
import useWorkspace from "./use-workspace";

export function useFraudEventGroups({
  enabled = true,
  query,
}: {
  enabled?: boolean;
  query?: Partial<z.infer<typeof groupedFraudEventsQuerySchema>>;
} = {}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString({
    workspaceId,
    ...query,
  });

  const { data, error } = useSWR<fraudEventGroupProps[]>(
    enabled && defaultProgramId ? `/api/fraud-events${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents: data,
    loading: !data && !error,
    error,
  };
}
