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
  includeParams,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  includeParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<T[]>(
    enabled && defaultProgramId
      ? `/api/groups${
          // TODO: standardize how we handle params in useSWR hooks – it's a bit all over the place rn
          includeParams
            ? getQueryString(
                {
                  workspaceId,
                  sortBy: "saleAmount",
                  ...query,
                },
                {
                  exclude: ["partnerId"],
                },
              )
            : `?workspaceId=${workspaceId}`
        }`
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
