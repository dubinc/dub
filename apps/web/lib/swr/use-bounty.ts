import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { BountyProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useBounty({ bountyId }: { bountyId: string }) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: bounty,
    error,
    isLoading,
  } = useSWR<BountyProps>(
    workspaceId && bountyId
      ? `/api/bounties/${bountyId}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    bounty,
    isLoading,
    error,
  };
}
