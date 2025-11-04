import { BountySubmissionStatus } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export interface SubmissionsCountByStatus {
  status: BountySubmissionStatus;
  count: number;
}

export function useBountySubmissionsCount<T>({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const { bountyId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data: submissionsCount, error } = useSWR<T>(
    enabled &&
      workspaceId &&
      `/api/bounties/count/submissions${getQueryString({
        workspaceId,
        ...(bountyId ? { bountyId } : {}),
      })}`,
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
