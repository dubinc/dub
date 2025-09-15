import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { GroupProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useGroup({
  groupIdOrSlug: groupIdOrSlugProp,
}: { groupIdOrSlug?: string } = {}) {
  const { id: workspaceId } = useWorkspace();
  const { groupSlug: groupSlugParam } = useParams<{ groupSlug: string }>();

  const groupIdOrSlug = groupIdOrSlugProp ?? groupSlugParam;

  const {
    data: group,
    error,
    mutate: mutateGroup,
  } = useSWR<GroupProps>(
    workspaceId && groupIdOrSlug
      ? `/api/groups/${groupIdOrSlug}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    group,
    error,
    mutateGroup,
    loading: !group && !error,
  };
}
