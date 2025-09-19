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

  const { data, isLoading, error } = useSWR<T[]>(
    enabled && workspaceId && defaultProgramId
      ? `/api/groups?${new URLSearchParams({
          workspaceId,
          sortBy: "totalSaleAmount",
          ...(query as Record<string, string>),
        }).toString()}`
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
