import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { BountyExtendedProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useBounty({ bountyId }: { bountyId: string }) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: bounty,
    error,
    isLoading,
  } = useSWR<BountyExtendedProps>(
    workspaceId && bountyId
      ? `/api/bounties/${bountyId}?workspaceId=${workspaceId}&includeExpandedFields=true`
      : undefined,
    fetcher,
  );

  return {
    bounty,
    isLoading,
    error,
  };
}
