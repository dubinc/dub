"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { BountyCard } from "./bounty-card";

// TODO:
// Fix loading state
// Fix error state
// Fix no bounties state

export function BountyList() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<BountyProps[]>(
    workspaceId && defaultProgramId
      ? `/api/bounties?workspaceId=${workspaceId}&programId=${defaultProgramId}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  if (isLoading) {
    return <></>;
  }

  if (error) {
    return <></>;
  }

  if (!bounties || bounties.length === 0) {
    return <></>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {bounties.map((bounty) => (
        <BountyCard key={bounty.id} bounty={bounty} />
      ))}
    </div>
  );
}
