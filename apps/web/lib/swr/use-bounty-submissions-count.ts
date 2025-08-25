import { BountySubmissionStatus } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export interface SubmissionsCountByStatus {
  status: BountySubmissionStatus;
  count: number;
}

export function useBountySubmissionsCount<T>({
  enabled,
}: {
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const shouldFetch = Boolean(enabled && workspaceId);

  const { data: submissionsCount, error } = useSWR<T>(
    shouldFetch
      ? `/api/bounties/count${getQueryString({
          workspaceId,
        })}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    submissionsCount,
    error,
  };
}
