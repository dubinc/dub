"use client";

import { getProgramBountyMeta } from "@/lib/bounty/bounty-period";
import useBounty from "@/lib/swr/use-bounty";
import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { ScrollableTooltipContent, Tag, Tooltip } from "@dub/ui";
import { Calendar6, Users, Users6 } from "@dub/ui/icons";
import { useMemo } from "react";
import { BountyActionButton } from "../bounty-action-button";

export function BountyInfo() {
  const { bounty, loading } = useBounty();
  const { isOwner } = useWorkspace();

  const { groups } = useGroups();
  const { partnerTags } = usePartnerTags();

  const eligibleGroups = useMemo(() => {
    if (!groups || !bounty || bounty.groups.length === 0) {
      return [];
    }
    return bounty.groups
      .map((bountyGroup) => groups.find((g) => g.id === bountyGroup.id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);
  }, [groups, bounty]);

  const eligibleTags = useMemo(() => {
    if (!partnerTags || !bounty || bounty.partnerTags.length === 0) {
      return [];
    }
    return bounty.partnerTags
      .map((bountyTag) => partnerTags.find((t) => t.id === bountyTag.id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [partnerTags, bounty]);

  if (loading) {
    return <BountyInfoSkeleton />;
  }

  if (!bounty) {
    return null;
  }

  const { dateRangeLabel, partnerAudienceLabel } = getProgramBountyMeta(bounty);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative flex h-[100px] w-full items-center justify-center rounded-lg bg-neutral-100 p-4 sm:h-[128px] sm:w-[100px] sm:shrink-0">
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

        <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
          <Users className="size-4 shrink-0" />
          <span>{partnerAudienceLabel}</span>
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

        {isOwner && (
          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Tag className="size-4 shrink-0" />
            {bounty.partnerTags.length === 0 ? (
              <span>All tags</span>
            ) : eligibleTags.length === 1 ? (
              <span className="truncate">{eligibleTags[0].name}</span>
            ) : eligibleTags.length > 1 ? (
              <Tooltip
                content={
                  <ScrollableTooltipContent>
                    {eligibleTags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <span className="font-regular text-sm text-neutral-700">
                          {tag.name}
                        </span>
                      </div>
                    ))}
                  </ScrollableTooltipContent>
                }
              >
                <span className="truncate">
                  {eligibleTags[0].name} +{eligibleTags.length - 1}
                </span>
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
