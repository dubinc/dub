import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { FraudGroupProps } from "../types";
import { fraudGroupQuerySchema } from "../zod/schemas/fraud";
import useWorkspace from "./use-workspace";

export function useFraudGroups({
  enabled = true,
  exclude = [],
  query,
}: {
  enabled?: boolean;
  exclude?: (keyof z.infer<typeof fraudGroupQuerySchema>)[];
  query?: Partial<z.infer<typeof fraudGroupQuerySchema>>;
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

  const { data, error } = useSWR<FraudGroupProps[]>(
    enabled && defaultProgramId ? `/api/fraud/groups${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudGroups: data,
    loading: enabled && !data && !error,
    error,
  };
}
