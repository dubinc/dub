import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { BountyProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useBounty() {
  const { id: workspaceId } = useWorkspace();
  const { bountyId } = useParams<{ bountyId: string }>();

  const { data: bounty, error } = useSWR<BountyProps>(
    workspaceId && bountyId
      ? `/api/bounties/${bountyId}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    bounty,
    loading: !bounty && !error,
    error,
  };
}
