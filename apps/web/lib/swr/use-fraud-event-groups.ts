import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { FraudEventGroupProps } from "../types";
import { groupedFraudEventsQuerySchema } from "../zod/schemas/fraud";
import useWorkspace from "./use-workspace";

export function useFraudEventGroups({
  enabled = true,
  exclude = [],
  query,
}: {
  enabled?: boolean;
  exclude?: (keyof z.infer<typeof groupedFraudEventsQuerySchema>)[];
  query?: Partial<z.infer<typeof groupedFraudEventsQuerySchema>>;
} = {}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString(
    {
      workspaceId,
      ...query,
    },
    { exclude },
  );

  const { data, error } = useSWR<FraudEventGroupProps[]>(
    enabled && defaultProgramId ? `/api/fraud/events${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents: data,
    loading: enabled && !data && !error,
    error,
  };
}
