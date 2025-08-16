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
}: {
  query?: z.infer<typeof partialQuerySchema>;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<T[]>(
    defaultProgramId
      ? `/api/groups${getQueryString(
          {
            workspaceId,
            sortBy: "saleAmount",
            ...query,
          },
          {
            exclude: ["partnerId"],
          },
        )}`
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
