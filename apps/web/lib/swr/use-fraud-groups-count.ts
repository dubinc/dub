import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { fraudGroupCountQuerySchema } from "../zod/schemas/fraud";

export function useFraudGroupCount<T>({
  query,
  enabled = true,
  ignoreParams = false,
}: {
  query?: Partial<z.infer<typeof fraudGroupCountQuerySchema>>;
  enabled?: boolean;
  ignoreParams?: boolean;
} = {}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString(
    {
      workspaceId,
      ...query,
    },
    ignoreParams
      ? { include: [] }
      : {
          exclude: ["page", "pageSize", "sortBy", "sortOrder", "groupId"],
        },
  );

  const { data, error } = useSWR(
    defaultProgramId && enabled
      ? `/api/fraud/groups/count${queryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudGroupCount: data as T,
    loading: !error && data === undefined,
    error,
  };
}
