import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { GroupProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useGroup({ groupIdOrSlug }: { groupIdOrSlug: string }) {
  const { id: workspaceId } = useWorkspace();

  const { data: group, error } = useSWR<GroupProps>(
    workspaceId && groupIdOrSlug
      ? `/api/groups/${groupIdOrSlug}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    group,
    error,
    loading: !group && !error,
  };
}
