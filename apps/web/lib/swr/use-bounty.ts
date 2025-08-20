import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { BountyExtendedProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useBounty() {
  const { id: workspaceId } = useWorkspace();
  const { bountyId } = useParams<{ bountyId: string }>();

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
