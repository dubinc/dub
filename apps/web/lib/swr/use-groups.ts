import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { GroupProps } from "../types";
import { getGroupsQuerySchema } from "../zod/schemas/groups";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getGroupsQuerySchema.partial();

export default function useGroups<T extends GroupProps>({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryEnabled = enabled && defaultProgramId;

  const { data, isLoading, error } = useSWR<T[]>(
    queryEnabled
      ? `/api/groups${getQueryString({ workspaceId, ...query }, { exclude: ["partnerId"] })}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    groups: data,
    loading: isLoading,
    error,
  };
}
