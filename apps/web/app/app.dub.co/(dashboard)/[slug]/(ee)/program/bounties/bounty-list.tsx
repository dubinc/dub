"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Trophy } from "lucide-react";
import useSWR from "swr";
import { useBountySheet } from "./add-edit-bounty-sheet";
import { BountyCard, BountyCardSkeleton } from "./bounty-card";

export function BountyList() {
  const { id: workspaceId } = useWorkspace();
  const { setShowCreateBountySheet, BountySheet } = useBountySheet();

  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<BountyListProps[]>(
    workspaceId
      ? `/api/bounties?${new URLSearchParams({ workspaceId, includeSubmissionsCount: "true" }).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <>
      {BountySheet}
      {Boolean(bounties?.length) || isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => (
                <BountyCardSkeleton key={index} />
              ))
            : bounties?.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} />
              ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center px-4 py-8">
          <p className="text-content-subtle text-sm">
            Failed to load bounties.
          </p>
        </div>
      ) : (
        <AnimatedEmptyState
          title="No bounties active"
          description={
            <>
              This program doesn't have any active bounties.{" "}
              <a
                href="https://dub.co/help/article/program-bounties"
                target="_blank"
                rel="noopener noreferrer"
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
              onClick={() => setShowCreateBountySheet(true)}
            />
          }
        />
      )}
    </>
  );
}
