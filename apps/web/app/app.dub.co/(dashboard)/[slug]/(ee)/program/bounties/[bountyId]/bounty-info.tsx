"use client";

import { getProgramBountyMeta } from "@/lib/bounty/bounty-period";
import useBounty from "@/lib/swr/use-bounty";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyEligibilitySummary } from "@/ui/partners/bounties/bounty-eligibility-summary";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Calendar6 } from "@dub/ui/icons";
import { BountyActionButton } from "../bounty-action-button";

export function BountyInfo() {
  const { bounty, loading } = useBounty();
  const { isOwner } = useWorkspace();

  if (loading) {
    return <BountyInfoSkeleton />;
  }

  if (!bounty) {
    return null;
  }

  const { dateRangeLabel } = getProgramBountyMeta(bounty);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative flex h-[100px] w-full items-center justify-center rounded-lg bg-neutral-100 p-4 sm:size-[100px] sm:shrink-0">
        <BountyThumbnailImage bounty={bounty} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words text-base font-semibold leading-6 text-neutral-900 sm:truncate">
            {bounty.name}
          </h3>
          <div className="shrink-0 sm:hidden">
            <BountyActionButton bounty={bounty} />
          </div>
        </div>

        <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
          <Calendar6 className="size-4 shrink-0" />
          <span>{dateRangeLabel}</span>
        </div>

        <BountyRewardDescription bounty={bounty} className="font-regular" />

        {isOwner && (
          <BountyEligibilitySummary
            groups={bounty.groups}
            partnerTags={bounty.partnerTags}
            iconClassName="size-4"
            className="font-regular"
          />
        )}
      </div>

      <div className="hidden items-start sm:flex">
        <BountyActionButton bounty={bounty} />
      </div>
    </div>
  );
}

function BountyInfoSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative flex size-[100px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="h-6 w-48 animate-pulse rounded-md bg-neutral-200" />
          <div className="flex shrink-0 items-start gap-2 sm:hidden">
            <div className="h-9 w-16 animate-pulse rounded-md bg-neutral-200" />
            <div className="h-9 w-9 animate-pulse rounded-md bg-neutral-200" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="size-4 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="size-4 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="size-4 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
      <div className="hidden items-start gap-2 sm:flex">
        <div className="h-9 w-16 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-9 w-9 animate-pulse rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}
