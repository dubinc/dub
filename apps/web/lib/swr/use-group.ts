import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { GroupProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useGroup() {
  const { id: workspaceId } = useWorkspace();
  const { groupSlug } = useParams<{ groupSlug: string }>();

  const {
    data: group,
    error,
    mutate: mutateGroup,
  } = useSWR<GroupProps>(
    workspaceId && groupSlug
      ? `/api/groups/${groupSlug}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    group,
    error,
    mutateGroup,
    loading: !group && !error,
  };
}
