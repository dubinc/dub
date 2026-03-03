"use client";

import usePartnerBounty from "@/lib/swr/use-partner-bounty";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "@/ui/partners/bounties/bounty-performance";
import { ChevronRight, Trophy } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";

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
          ) : null}
        </div>
        <div />
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

export function PartnerBountyPageHeaderTitle() {
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
      <div>
        {bounty ? (
          bounty.name
        ) : (
          <div className="h-6 w-48 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </div>
  );
}
