"use client";

import usePartnerBounty from "@/lib/swr/use-partner-bounty";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BountyDescription } from "@/ui/partners/bounties/bounty-description";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "@/ui/partners/bounties/bounty-performance";
import { BountyRewardCriteria } from "@/ui/partners/bounties/bounty-reward-criteria";
import { BountySubmissionRequirements } from "@/ui/partners/bounties/bounty-submission-requirements";
import { ChevronRight, Trophy } from "@dub/ui";
import { cn, truncate } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { PartnerBountyCard, PartnerBountyCardSkeleton } from "../bounty-card";

export function PartnerBountyPageClient() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { bounty, isLoading } = usePartnerBounty();

  if (!bounty && !isLoading) {
    redirect(`/programs/${programSlug}/bounties`);
  }

  return (
    <PageWidthWrapper className="flex flex-col gap-6 pb-10">
      <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <BountyDetailsProgressSkeleton />
          ) : bounty ? (
            <>
              <div className="flex flex-col gap-3">
                <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
                  Progress
                </h2>
                <div className="border-border-subtle flex w-full flex-col gap-4 rounded-xl border bg-white px-5 pb-4 pt-6">
                  {bounty.type === "performance" ? (
                    <PerformanceBountyProgress bounty={bounty} />
                  ) : (
                    <SubmissionBountyProgress bounty={bounty} />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-6 text-sm">
                <BountySubmissionRequirements bounty={bounty} />
                <BountyRewardCriteria bounty={bounty} />
                <BountyDescription bounty={bounty} />
              </div>
            </>
          ) : null}
        </div>
        <div className="@3xl/page:contents flex flex-col gap-6">
          {isLoading ? (
            <PartnerBountyCardSkeleton />
          ) : bounty ? (
            <div className="@3xl/page:w-[360px] @3xl/page:shrink-0 w-full">
              <PartnerBountyCard bounty={bounty} showFullTitle />
            </div>
          ) : null}
        </div>
      </div>
    </PageWidthWrapper>
  );
}

function BountyDetailsProgressSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-7 w-20 animate-pulse rounded-md bg-neutral-200" />
      <div className="border-border-subtle flex flex-col gap-4 rounded-xl border bg-white px-5 pb-4 pt-6">
        <div className="h-1 w-full animate-pulse rounded-full bg-neutral-200" />
        <div className="flex gap-1">
          <div className="h-6 w-8 animate-pulse rounded bg-neutral-200" />
          <div className="h-6 w-6 animate-pulse rounded bg-neutral-200" />
          <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

export function PartnerBountyPageHeader() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { bounty } = usePartnerBounty();

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/programs/${programSlug}/bounties`}
        aria-label="Back to bounties"
        title="Back to bounties"
        className={cn(
          "bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-bg-emphasis transition-[transform,background-color] duration-150 active:scale-95",
        )}
      >
        <Trophy className="size-4" />
      </Link>
      <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
      <div className="min-w-0 truncate">
        {bounty ? (
          truncate(bounty.name, 70)
        ) : (
          <div className="h-6 w-48 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </div>
  );
}
