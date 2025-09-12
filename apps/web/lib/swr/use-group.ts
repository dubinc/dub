import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { GroupProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useGroup({ slug: slugProp }: { slug?: string } = {}) {
  const { id: workspaceId } = useWorkspace();
  const { groupSlug: groupSlugParam } = useParams<{ groupSlug: string }>();

  const groupSlug = slugProp ?? groupSlugParam;

  const {
    data: group,
    error,
    mutate: mutateGroup,
  } = useSWR<GroupProps>(
    workspaceId && groupSlug
      ? `/api/groups/${groupSlug}?workspaceId=${workspaceId}`
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
