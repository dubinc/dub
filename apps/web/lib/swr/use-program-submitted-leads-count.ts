import useWorkspace from "@/lib/swr/use-workspace";
import { getSubmittedLeadsCountQuerySchema } from "@/lib/zod/schemas/submitted-leads";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

export function useProgramSubmittedLeadsCount<T = number>({
  query,
  ignoreParams,
  enabled = true,
}: {
  query?: z.infer<typeof getSubmittedLeadsCountQuerySchema>;
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error, isLoading } = useSWR<T>(
    enabled &&
      workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/submitted-leads/count${getQueryString(
        { workspaceId, ...query },
        {
          include: ignoreParams ? [] : ["partnerId", "status", "search"],
        },
      )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data: enabled ? data : undefined,
    error,
    loading: isLoading,
  };
}
