import useGroups from "@/lib/swr/use-groups";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { DynamicTooltipWrapper, ScrollableTooltipContent } from "@dub/ui";
import { Calendar6, Users, Users6 } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

export function BountyCard({ bounty }: { bounty: BountyListProps }) {
  const { slug: workspaceSlug, isOwner } = useWorkspace();

  const { totalPartners, loading } = usePartnersCountByGroupIds({
    groupIds: bounty.groups.map((group) => group.id),
  });

  const { groups } = useGroups();

  const eligibleGroups = useMemo(() => {
    if (!groups || bounty.groups.length === 0) {
      return [];
    }
    return bounty.groups
      .map((bountyGroup) => groups.find((g) => g.id === bountyGroup.id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);
  }, [groups, bounty.groups]);

  return (
    <div className="border-border-subtle hover:border-border-default relative cursor-pointer rounded-xl border bg-white p-2 transition-all hover:shadow-lg">
      <Link
        href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
        className="flex flex-col gap-3.5"
      >
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

        <div className="flex flex-col gap-1.5 px-2 pb-1.5">
          <h3 className="text-content-emphasis text-sm font-semibold md:truncate">
            {bounty.name}
          </h3>

          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Calendar6 className="size-3.5" />
            <span>
              {formatDate(bounty.startsAt, { month: "short" })}
              {bounty.endsAt && (
                <>
                  {" → "}
                  {formatDate(bounty.endsAt, { month: "short" })}
                </>
              )}
            </span>
          </div>

          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Users className="size-3.5" />
            <div className="h-5">
              {loading ? (
                <span className="inline-block h-5 w-8 animate-pulse rounded bg-neutral-200 align-middle" />
              ) : totalPartners === 0 ? (
                <>
                  <span className="text-content-default">0</span>{" "}
                  {pluralize("partner", 0)}{" "}
                  {bounty.type === "performance" ? "completed" : "submitted"}
                </>
              ) : bounty.submissionsCountData?.total === totalPartners ? (
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
                    {nFormatter(bounty.submissionsCountData?.total ?? 0, {
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
            </div>
          </div>

          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Users6 className="size-3.5" />
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
          </div>
        </div>
      </Link>
    </div>
  );
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
    <div className="border-border-subtle rounded-xl border bg-white p-2">
      <div className="flex flex-col gap-3.5">
        <div className="relative flex h-[124px] items-center justify-center rounded-lg bg-neutral-100 py-3">
          <div className="h-full w-full animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="flex flex-col gap-1.5 px-2 pb-1.5">
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
            <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
