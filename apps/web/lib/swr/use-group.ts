import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { GroupProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useGroup<T = GroupProps>(
  {
    groupIdOrSlug: groupIdOrSlugProp,
    query,
    shouldFetch,
  }: {
    groupIdOrSlug?: string;
    query?: Record<string, any>;
    shouldFetch?: boolean;
  } = {},
  swrOpts?: SWRConfiguration,
) {
  const { id: workspaceId } = useWorkspace();
  const { groupSlug: groupSlugParam } = useParams<{ groupSlug: string }>();

  const groupIdOrSlug = groupIdOrSlugProp ?? groupSlugParam;

  const {
    data: group,
    error,
    mutate: mutateGroup,
  } = useSWR<T>(
    workspaceId && groupIdOrSlug && shouldFetch !== false
      ? `/api/groups/${groupIdOrSlug}?${new URLSearchParams({ workspaceId, ...query }).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    group,
    error,
    mutateGroup,
    loading: !group && !error,
  };
}
