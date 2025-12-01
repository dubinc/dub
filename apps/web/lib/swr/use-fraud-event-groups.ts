import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { fraudEventGroupProps } from "../types";
import { fraudEventGroupQuerySchema } from "../zod/schemas/fraud";
import useWorkspace from "./use-workspace";

export function useFraudEventGroups({
  enabled = true,
  exclude = [],
  query,
}: {
  enabled?: boolean;
  exclude?: (keyof z.infer<typeof fraudEventGroupQuerySchema>)[];
  query?: Partial<z.infer<typeof fraudEventGroupQuerySchema>>;
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

  const { data, error } = useSWR<fraudEventGroupProps[]>(
    enabled && defaultProgramId ? `/api/fraud/groups${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEventGroups: data,
    loading: enabled && !data && !error,
    error,
  };
}
