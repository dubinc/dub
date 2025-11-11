import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEventCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";

interface UseFraudEventsCountProps
  extends z.infer<typeof FraudEventCountQuerySchema> {
  exclude?: string[];
}

export function useFraudEventsCount<T>({
  exclude,
  ...params
}: UseFraudEventsCountProps = {}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString(
    {
      ...params,
      workspaceId,
    },
    {
      exclude: exclude || [],
    },
  );

  const { data: fraudEventsCount, error } = useSWR(
    defaultProgramId ? `/api/fraud-events/count${queryString}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEventsCount: fraudEventsCount as T,
    loading: !error && fraudEventsCount === undefined,
    error,
  };
}
