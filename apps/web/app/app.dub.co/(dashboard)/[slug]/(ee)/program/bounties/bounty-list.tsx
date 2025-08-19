"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BountyExtendedProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { BountySheet } from "./add-edit-bounty-sheet";
import { BountyCard, BountyCardSkeleton } from "./bounty-card";

// TODO:
// Fix error state

export function BountyList() {
  const { searchParams } = useRouterStuff();

  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const [bountySheetState, setBountySheetState] = useState<
    { open: false; bountyId: string | null } | { open: true; bountyId: string }
  >({ open: false, bountyId: null });

  // Open/close edit bounty sheet
  useEffect(() => {
    const bountyId = searchParams.get("bountyId");
    console.log("bountyId", bountyId);
    setBountySheetState(
      bountyId ? { open: true, bountyId } : { open: false, bountyId: null },
    );
  }, [searchParams.get("bountyId")]);

  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<BountyExtendedProps[]>(
    workspaceId && defaultProgramId
      ? `/api/bounties?workspaceId=${workspaceId}&programId=${defaultProgramId}&includeExpandedFields=true`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  if (error) {
    return <></>;
  }

  const currentBounty = bountySheetState.bountyId
    ? bounties?.find((b) => b?.id === bountySheetState.bountyId)
    : undefined;

  return bounties?.length !== 0 || isLoading ? (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {bountySheetState.open &&
        (!bountySheetState.bountyId || currentBounty) && (
          <BountySheet
            isOpen={bountySheetState.open}
            setIsOpen={(open) =>
              setBountySheetState((s) => ({ ...s, open }) as any)
            }
            bounty={currentBounty}
          />
        )}
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
      <AnimatedEmptyState
        title="No bounties active"
        description={
          <>
            This program doesn't have any active bounties.{" "}
            <a
              href="https://dub.co/help/article/bounties"
              target="_blank"
              className="hover:text-content-default underline sm:whitespace-nowrap"
            >
              Learn more about bounties
            </a>
            .
          </>
        }
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
            onClick={() =>
              setBountySheetState(
                (s) => ({ bountyId: null, open: true }) as any,
              )
            }
          />
        }
      />
    </>
  );
}
