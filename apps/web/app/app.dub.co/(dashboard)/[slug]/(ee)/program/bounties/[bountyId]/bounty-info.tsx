"use client";

import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import useBounty from "@/lib/swr/use-bounty";
import {
  SubmissionsCountByStatus,
  useBountySubmissionsCount,
} from "@/lib/swr/use-bounty-submissions-count";
import useGroups from "@/lib/swr/use-groups";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { ScrollableTooltipContent, Tooltip } from "@dub/ui";
import { Calendar6, Gift, Users, Users6 } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import { useMemo } from "react";
import { BountyActionButton } from "../bounty-action-button";

export function BountyInfo() {
  const { bounty, loading } = useBounty();
  const { isOwner } = useWorkspace();

  const { submissionsCount } = useBountySubmissionsCount<
    SubmissionsCountByStatus[]
  >({
    enabled: Boolean(bounty),
  });

  const totalSubmissions = useMemo(() => {
    return submissionsCount
      ?.filter((s) => s.status === "submitted" || s.status === "approved")
      ?.reduce((acc, curr) => acc + curr.count, 0);
  }, [submissionsCount]);

  const readyForReviewSubmissions = useMemo(() => {
    return submissionsCount?.find((s) => s.status === "submitted")?.count ?? 0;
  }, [submissionsCount]);

  const { totalPartners, loading: totalPartnersForBountyLoading } =
    usePartnersCountByGroupIds({
      groupIds: bounty?.groups?.map((group) => group.id) ?? [],
    });

  const { groups } = useGroups();

  const eligibleGroups = useMemo(() => {
    if (!groups || !bounty || bounty.groups.length === 0) {
      return [];
    }
    return bounty.groups
      .map((bountyGroup) => groups.find((g) => g.id === bountyGroup.id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);
  }, [groups, bounty]);

  if (loading) {
    return <BountyInfoSkeleton />;
  }

  if (!bounty) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative flex h-[100px] w-full items-center justify-center rounded-lg bg-neutral-100 p-4 sm:h-[128px] sm:w-[100px] sm:shrink-0">
        <BountyThumbnailImage bounty={bounty} />
        <div className="absolute right-2 top-2 sm:hidden">
          <BountyActionButton bounty={bounty} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="break-words text-base font-semibold leading-6 text-neutral-900 sm:truncate">
          {bounty.name}
        </h3>

        <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
          <Calendar6 className="size-4 shrink-0" />
          <span>
            {formatDate(bounty.startsAt, { month: "short" })}
            {" → "}
            {bounty.endsAt
              ? formatDate(bounty.endsAt, { month: "short" })
              : "No end date"}
          </span>
        </div>

        {getBountyRewardDescription(bounty) && (
          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Gift className="size-4 shrink-0" />
            <span className="text-ellipsis">
              {getBountyRewardDescription(bounty)}
            </span>
          </div>
        )}

        <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
          <Users className="size-4 shrink-0" />
          <div>
            {totalPartnersForBountyLoading ? (
              <span className="inline-block h-4 w-8 animate-pulse rounded bg-neutral-200 align-middle" />
            ) : totalPartners === 0 ? (
              <>
                <span className="text-content-default">0</span>{" "}
                {pluralize("partner", 0)}{" "}
                {bounty.type === "performance" ? "completed" : "submitted"}
              </>
            ) : totalSubmissions === totalPartners ? (
              <>
                All{" "}
                <span className="text-content-default">
                  {nFormatter(totalPartners, { full: true })}
                </span>{" "}
                {pluralize("partner", totalPartners)}{" "}
                {bounty.type === "performance" ? "completed" : "submitted"}
              </>
            ) : (
              <>
                <span className="text-content-default">
                  {nFormatter(totalSubmissions ?? 0, {
                    full: true,
                  })}
                </span>{" "}
                of{" "}
                <span className="text-content-default">
                  {nFormatter(totalPartners, { full: true })}
                </span>{" "}
                {pluralize("partner", totalPartners)}{" "}
                {bounty.type === "performance" ? "completed" : "submitted"}
              </>
            )}
            {readyForReviewSubmissions > 0 && (
              <>
                {" "}
                (
                <span className="text-content-default">
                  {nFormatter(readyForReviewSubmissions, { full: true })}
                </span>{" "}
                awaiting review)
              </>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Users6 className="size-4 shrink-0" />
            {bounty.groups.length === 0 ? (
              <span>All groups</span>
            ) : eligibleGroups.length === 1 ? (
              <div className="flex items-center gap-1.5">
                <GroupColorCircle group={eligibleGroups[0]} />
                <span className="truncate">{eligibleGroups[0].name}</span>
              </div>
            ) : eligibleGroups.length > 1 ? (
              <Tooltip
                content={
                  <ScrollableTooltipContent>
                    {eligibleGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2">
                        <GroupColorCircle group={group} />
                        <span className="font-regular text-sm text-neutral-700">
                          {group.name}
                        </span>
                      </div>
                    ))}
                  </ScrollableTooltipContent>
                }
              >
                <div className="flex items-center gap-1.5">
                  <GroupColorCircle group={eligibleGroups[0]} />
                  <span className="truncate">
                    {eligibleGroups[0].name} +{eligibleGroups.length - 1}
                  </span>
                </div>
              </Tooltip>
            ) : null}
          </div>
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
      <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-3 sm:h-[128px]" />
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
