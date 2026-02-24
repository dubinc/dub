import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { groupRulesSchema } from "../zod/schemas/groups";
import useWorkspace from "./use-workspace";

type GroupRules = z.infer<typeof groupRulesSchema>;

export function useGroupMoveRules() {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<GroupRules>(
    workspaceId ? `/api/groups/rules?workspaceId=${workspaceId}` : null,
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
