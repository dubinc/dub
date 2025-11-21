import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { fraudEventCountQuerySchema } from "../zod/schemas/fraud";

export function useFraudEventsCount<T>({
  filters,
  enabled = true,
}: {
  filters: Partial<z.infer<typeof fraudEventCountQuerySchema>>;
  enabled?: boolean;
}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString(
    {
      workspaceId,
      ...filters,
    },
    {
      exclude: ["page", "pageSize", "sortBy", "sortOrder"],
    },
  );

  const { data: fraudEventsCount, error } = useSWR(
    defaultProgramId && enabled
      ? `/api/fraud-events/count${queryString}`
      : null,
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
