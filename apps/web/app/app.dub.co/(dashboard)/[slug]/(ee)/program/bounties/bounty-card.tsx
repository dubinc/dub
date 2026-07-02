import { BOUNTY_DURATION_DAYS } from "@/lib/bounty/bounty-period";
import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import {
  BountyProgressBarRow,
  EmphasisNumber,
} from "@/ui/partners/bounties/bounty-progress-bar-row";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { DynamicTooltipWrapper, ScrollableTooltipContent } from "@dub/ui";
import { Calendar6, Users, Users6 } from "@dub/ui/icons";
import { cn, formatDate, nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

const tagPillClassName =
  "bg-bg-inverted/5 text-content-default inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-xs font-semibold leading-tight";

export function BountyCard({ bounty }: { bounty: BountyListProps }) {
  const { slug: workspaceSlug, isOwner } = useWorkspace();

  const { totalPartners, loading } = usePartnersCountByGroupIds({
    groupIds: bounty.groups.map((group) => group.id),
  });

  const { groups } = useGroups();
  const { partnerTags } = usePartnerTags();

  const eligibleGroups = useMemo(() => {
    if (!groups || bounty.groups.length === 0) {
      return [];
    }
    return bounty.groups
      .map((bountyGroup) => groups.find((g) => g.id === bountyGroup.id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);
  }, [groups, bounty.groups]);

  const eligibleTags = useMemo(() => {
    if (!partnerTags || bounty.partnerTags.length === 0) {
      return [];
    }

    return bounty.partnerTags
      .map((bountyTag) => partnerTags.find((t) => t.id === bountyTag.id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [partnerTags, bounty.partnerTags]);

  return (
    <div className="border-border-subtle hover:border-border-default relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg">
      <Link
        href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
        className="flex flex-col"
      >
        <div className="p-2 pb-0">
          <div className="relative flex h-[124px] items-center justify-center rounded-lg bg-neutral-100 py-3">
            <div className="relative size-full">
              <BountyThumbnailImage bounty={bounty} />
            </div>

            <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
              {bounty.submissionsCountData &&
                bounty.submissionsCountData.submitted > 0 && (
                  <SubmissionsCountBadge
                    count={bounty.submissionsCountData.submitted}
                  />
                )}
              {bounty.endsAt && new Date(bounty.endsAt) < new Date() && (
                <BountyEndedBadge endsAt={bounty.endsAt} />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 px-4 pb-4 pt-2">
          <h3 className="text-content-emphasis text-sm font-semibold md:truncate">
            {bounty.name}
          </h3>

          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Calendar6 className="size-3.5" />
            <span>{getBountyPeriodLabel(bounty)}</span>
          </div>

          <BountyRewardDescription
            bounty={bounty}
            className="font-regular"
            onTooltipClick={(e) => e.preventDefault()}
          />

          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Users className="size-3.5" />
            <span>
              {bounty.startMode === "relative"
                ? "New partners only"
                : "All partners"}
            </span>
          </div>

          <div className="text-content-subtle font-regular flex min-w-0 items-center gap-2 text-sm">
            <Users6 className="size-3.5 shrink-0" />
            <div className="flex min-w-0 items-center gap-1.5">
              {bounty.groups.length === 0 ? (
                <span>All groups</span>
              ) : eligibleGroups.length > 0 ? (
                <DynamicTooltipWrapper
                  tooltipProps={
                    eligibleGroups.length > 1
                      ? {
                          content: (
                            <ScrollableTooltipContent>
                              {eligibleGroups.map((group) => (
                                <div
                                  key={group.id}
                                  className="flex items-center gap-2"
                                >
                                  <GroupColorCircle group={group} />
                                  <span className="font-regular text-sm text-neutral-700">
                                    {group.name}
                                  </span>
                                </div>
                              ))}
                            </ScrollableTooltipContent>
                          ),
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <GroupColorCircle group={eligibleGroups[0]} />
                    <span className="truncate">
                      {eligibleGroups[0].name}{" "}
                      {eligibleGroups.length > 1
                        ? `+${eligibleGroups.length - 1}`
                        : ""}
                    </span>
                  </div>
                </DynamicTooltipWrapper>
              ) : (
                <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
              )}

              {bounty.partnerTags.length > 0 && (
                <>
                  <span className="text-content-muted shrink-0">·</span>
                  {eligibleTags.length > 0 ? (
                    <DynamicTooltipWrapper
                      tooltipProps={
                        eligibleTags.length > 1
                          ? {
                              content: (
                                <ScrollableTooltipContent>
                                  {eligibleTags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className={cn(
                                        tagPillClassName,
                                        "whitespace-nowrap",
                                      )}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </ScrollableTooltipContent>
                              ),
                            }
                          : undefined
                      }
                    >
                      <div className="flex min-w-0 items-center gap-1">
                        <span className={cn(tagPillClassName, "truncate")}>
                          {eligibleTags[0].name}
                        </span>
                        {eligibleTags.length > 1 && (
                          <span className={tagPillClassName}>
                            +{eligibleTags.length - 1}
                          </span>
                        )}
                      </div>
                    </DynamicTooltipWrapper>
                  ) : (
                    <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <BountySubmissionStatsFooter
          bounty={bounty}
          totalPartners={totalPartners}
          loading={loading}
        />
      </Link>
    </div>
  );
}

function BountySubmissionStatsFooter({
  bounty,
  totalPartners,
  loading,
}: {
  bounty: BountyListProps;
  totalPartners: number;
  loading: boolean;
}) {
  const submissionCount = bounty.submissionsCountData?.total ?? 0;
  const actionLabel = bounty.type === "performance" ? "completed" : "submitted";

  const progress =
    totalPartners > 0
      ? Math.min(Math.max((submissionCount / totalPartners) * 100, 0), 100)
      : 0;

  if (loading) {
    return (
      <div className="border-border-subtle border-t px-5 py-4">
        <div className="flex flex-col gap-2">
          <div className="bg-bg-emphasis h-1 w-full animate-pulse rounded-full" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-border-subtle border-t px-5 py-4">
      <BountyProgressBarRow progress={progress}>
        {totalPartners === 0 ? (
          <>
            <EmphasisNumber>0</EmphasisNumber> {actionLabel}
          </>
        ) : submissionCount === totalPartners ? (
          <>
            All{" "}
            <EmphasisNumber>
              {nFormatter(totalPartners, { full: true })}
            </EmphasisNumber>{" "}
            {actionLabel}
          </>
        ) : (
          <>
            <EmphasisNumber>
              {nFormatter(submissionCount, { full: true })}
            </EmphasisNumber>{" "}
            of{" "}
            <EmphasisNumber>
              {nFormatter(totalPartners, { full: true })}
            </EmphasisNumber>{" "}
            {actionLabel}
          </>
        )}
      </BountyProgressBarRow>
    </div>
  );
}

function getBountyPeriodLabel(bounty: BountyListProps): string {
  if (bounty.startMode === "relative") {
    const { endsAfterDays } = bounty;

    if (endsAfterDays === BOUNTY_DURATION_DAYS.twoWeeks) {
      return "2 weeks after joining";
    }

    if (endsAfterDays === BOUNTY_DURATION_DAYS.oneMonth) {
      return "1 month after joining";
    }

    if (endsAfterDays === BOUNTY_DURATION_DAYS.sixMonths) {
      return "6 months after joining";
    }

    if (endsAfterDays != null) {
      return `${endsAfterDays} days after joining`;
    }

    return "When a partner joins";
  }

  if (bounty.startsAt) {
    let label = formatDate(bounty.startsAt, { month: "short" });

    if (bounty.endsAt) {
      label += ` → ${formatDate(bounty.endsAt, { month: "short" })}`;
    }

    return label;
  }

  return "When a partner joins";
}

function SubmissionsCountBadge({ count }: { count: number }) {
  return (
    <div className="flex h-5 w-fit items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
      {nFormatter(count, { full: true })} {pluralize("submission", count)}{" "}
      awaiting review
    </div>
  );
}

function BountyEndedBadge({ endsAt }: { endsAt: Date }) {
  return (
    <div className="flex h-5 w-fit items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600">
      Ended {formatDate(endsAt, { month: "short" })}
    </div>
  );
}

export function BountyCardSkeleton() {
  return (
    <div className="border-border-subtle flex flex-col overflow-hidden rounded-xl border bg-white">
      <div className="p-2 pb-0">
        <div className="relative flex h-[124px] animate-pulse items-center justify-center rounded-lg bg-neutral-200" />
      </div>
      <div className="flex flex-col gap-1.5 px-4 pb-4 pt-2">
        <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="flex h-5 items-center gap-2">
          <div className="size-3.5 shrink-0 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="flex h-5 items-center gap-2">
          <div className="size-3.5 shrink-0 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="flex h-5 items-center gap-2">
          <div className="size-3.5 shrink-0 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-28 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
      <div className="border-border-subtle border-t px-5 py-4">
        <div className="flex flex-col gap-2">
          <div className="bg-bg-emphasis h-1 w-full animate-pulse rounded-full" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
