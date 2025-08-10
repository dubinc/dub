"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Trophy } from "lucide-react";
import useSWR from "swr";
import { useBountySheet } from "./add-edit-bounty-sheet";
import { BountyCard, BountyCardSkeleton } from "./bounty-card";

// TODO:
// Fix error state

export function BountyList() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { BountySheet, setShowCreateBountySheet } = useBountySheet({
    nested: false,
  });

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

  if (error) {
    return <></>;
  }

  return bounties?.length !== 0 || isLoading ? (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {isLoading
        ? Array.from({ length: 3 }, (_, index) => (
            <BountyCardSkeleton key={index} />
          ))
        : bounties?.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
    </div>
  ) : (
    <>
      {BountySheet}
      <AnimatedEmptyState
        title="No bounties found"
        description="No bounties have been created for this program yet."
        cardContent={() => (
          <>
            <Trophy className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
        addButton={
          <Button
            text="Create bounty"
            variant="primary"
            onClick={() => setShowCreateBountySheet(true)}
          />
        }
      />
    </>
  );
}
