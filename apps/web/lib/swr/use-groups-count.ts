import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { getGroupsQuerySchema } from "../zod/schemas/groups";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getGroupsQuerySchema.partial();

export default function useGroupsCount({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<number>(
    enabled && defaultProgramId
      ? `/api/groups/count${getQueryString({ workspaceId, ...query })}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    groupsCount: data,
    loading: isLoading,
    error,
  };
}
