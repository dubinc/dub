"use client";

import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { GroupProps, PartnerTagProps } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { DynamicTooltipWrapper, ScrollableTooltipContent } from "@dub/ui";
import { Users6 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useMemo } from "react";

type BountyEligibilitySummaryProps = {
  groups: { id: string }[];
  partnerTags: { id: string }[];
  iconClassName?: string;
  className?: string;
};

export function BountyEligibilitySummary({
  groups: bountyGroups,
  partnerTags: bountyPartnerTags,
  iconClassName = "size-3.5",
  className,
}: BountyEligibilitySummaryProps) {
  const { groups } = useGroups();
  const { partnerTags } = usePartnerTags();

  const eligibleGroups = useMemo(() => {
    if (!groups || bountyGroups.length === 0) {
      return [];
    }

    return bountyGroups
      .map((bountyGroup) => groups.find((g) => g.id === bountyGroup.id))
      .filter((g): g is GroupProps => g !== undefined);
  }, [groups, bountyGroups]);

  const eligibleTags = useMemo(() => {
    if (!partnerTags || bountyPartnerTags.length === 0) {
      return [];
    }

    return bountyPartnerTags
      .map((bountyTag) => partnerTags.find((t) => t.id === bountyTag.id))
      .filter((t): t is PartnerTagProps => t !== undefined);
  }, [partnerTags, bountyPartnerTags]);

  const groupsLoading = bountyGroups.length > 0 && !groups;
  const tagsLoading = bountyPartnerTags.length > 0 && !partnerTags;

  return (
    <div
      className={cn(
        "text-content-subtle flex min-w-0 items-center gap-2 text-sm font-normal",
        className,
      )}
    >
      <Users6 className={cn("shrink-0", iconClassName)} />
      <div className="flex min-w-0 items-center gap-1.5">
        {groupsLoading ? (
          <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
        ) : (
          <GroupsLabel
            bountyGroupCount={bountyGroups.length}
            eligibleGroups={eligibleGroups}
          />
        )}

        <span className="text-content-muted shrink-0">·</span>

        {tagsLoading ? (
          <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
        ) : (
          <TagsLabel
            bountyTagCount={bountyPartnerTags.length}
            eligibleTags={eligibleTags}
          />
        )}
      </div>
    </div>
  );
}

function GroupsLabel({
  bountyGroupCount,
  eligibleGroups,
}: {
  bountyGroupCount: number;
  eligibleGroups: GroupProps[];
}) {
  if (bountyGroupCount === 0) {
    return <span>All groups</span>;
  }

  if (eligibleGroups.length === 0) {
    return null;
  }

  const content = (
    <div className="flex min-w-0 items-center gap-1.5">
      <GroupColorCircle group={eligibleGroups[0]} />
      <span className="truncate">
        {eligibleGroups[0].name}
        {eligibleGroups.length > 1 ? ` +${eligibleGroups.length - 1}` : ""}
      </span>
    </div>
  );

  if (eligibleGroups.length === 1) {
    return content;
  }

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        content: (
          <ScrollableTooltipContent>
            {eligibleGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
                <GroupColorCircle group={group} />
                <span className="text-sm font-normal text-neutral-700">
                  {group.name}
                </span>
              </div>
            ))}
          </ScrollableTooltipContent>
        ),
      }}
    >
      {content}
    </DynamicTooltipWrapper>
  );
}

function TagsLabel({
  bountyTagCount,
  eligibleTags,
}: {
  bountyTagCount: number;
  eligibleTags: PartnerTagProps[];
}) {
  if (bountyTagCount === 0) {
    return <span>All tags</span>;
  }

  if (eligibleTags.length === 0) {
    return null;
  }

  const label = (
    <span className="truncate">
      {eligibleTags[0].name}
      {eligibleTags.length > 1 ? ` +${eligibleTags.length - 1}` : ""}
    </span>
  );

  if (eligibleTags.length === 1) {
    return label;
  }

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        content: (
          <ScrollableTooltipContent>
            {eligibleTags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                <span className="text-sm font-normal text-neutral-700">
                  {tag.name}
                </span>
              </div>
            ))}
          </ScrollableTooltipContent>
        ),
      }}
    >
      {label}
    </DynamicTooltipWrapper>
  );
}
