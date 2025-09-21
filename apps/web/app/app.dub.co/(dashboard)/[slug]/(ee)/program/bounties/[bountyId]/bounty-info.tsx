"use client";

import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import useBounty from "@/lib/swr/use-bounty";
import {
  SubmissionsCountByStatus,
  useBountySubmissionsCount,
} from "@/lib/swr/use-bounty-submissions-count";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import { CalendarDays, Gift, Users } from "lucide-react";
import { useMemo } from "react";
import { BountyActionButton } from "../bounty-action-button";

export function BountyInfo() {
  const { bounty, loading } = useBounty();

  const { submissionsCount } = useBountySubmissionsCount<
    SubmissionsCountByStatus[]
  >({
    enabled: Boolean(bounty),
  });

  const totalSubmissions = useMemo(() => {
    return submissionsCount?.reduce((acc, curr) => acc + curr.count, 0);
  }, [submissionsCount]);

  if (loading) {
    return <BountyInfoSkeleton />;
  }

  if (!bounty) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-3">
        <BountyThumbnailImage bounty={bounty} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="truncate text-base font-semibold leading-6 text-neutral-900">
          {bounty.name}
        </h3>

        <div className="flex items-center space-x-2">
          <CalendarDays className="size-4 shrink-0" />
          <span className="text-sm font-medium text-neutral-500">
            {formatDate(bounty.startsAt, { month: "short" })}
            {" → "}
            {bounty.endsAt
              ? formatDate(bounty.endsAt, { month: "short" })
              : "No end date"}
          </span>
        </div>

        <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
          <Gift className="size-4 shrink-0" />
          <span className="text-ellipsis">
            {getBountyRewardDescription(bounty)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Users className="size-4 shrink-0" />
          <div className="text-sm text-neutral-500">
            {totalSubmissions === undefined ? (
              <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
            ) : (
              <span className="font-medium text-neutral-700">
                {nFormatter(totalSubmissions, { full: true })}
              </span>
            )}{" "}
            of{" "}
            <span className="font-medium text-neutral-700">
              {nFormatter(bounty.partnersCount, { full: true })}
            </span>{" "}
            {pluralize("partner", bounty.partnersCount ?? 0)} submitted
          </div>
        </div>
      </div>

      <div className="flex items-start">
        <BountyActionButton bounty={bounty} />
      </div>
    </div>
  );
}

function BountyInfoSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-6 w-48 animate-pulse rounded-md bg-neutral-200" />
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
      <div className="flex items-start">
        <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}
