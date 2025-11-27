import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import useGroups from "@/lib/swr/use-groups";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Tooltip } from "@dub/ui";
import { Calendar6, Gift, Users, Users6 } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
          <h3 className="text-content-emphasis truncate text-sm font-semibold">
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

          {!isOwner && (
            <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
              <Gift className="size-3.5 shrink-0" />
              <span className="truncate">
                {getBountyRewardDescription(bounty)}
              </span>
            </div>
          )}

          <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
            <Users className="size-3.5" />
            <div className="h-5">
              {loading ? (
                <span className="inline-block h-4 w-8 animate-pulse rounded bg-neutral-200 align-middle" />
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

          {isOwner && (
            <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
              <Users6 className="size-3.5" />
              {bounty.groups.length === 0 ? (
                <span>All groups</span>
              ) : eligibleGroups.length === 1 ? (
                <div className="flex items-center gap-1.5">
                  <GroupColorCircle group={eligibleGroups[0]} />
                  <span className="truncate">{eligibleGroups[0].name}</span>
                </div>
              ) : eligibleGroups.length > 1 ? (
                <Tooltip
                  content={<ScrollableTooltipContent groups={eligibleGroups} />}
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
      </Link>
    </div>
  );
}

function ScrollableTooltipContent({
  groups,
}: {
  groups: Array<{ id: string; name: string; color: string | null }>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    setShowTopGradient(!isAtTop);
    setShowBottomGradient(!isAtBottom);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Check initial state
    checkScroll();

    // Add scroll listener
    element.addEventListener("scroll", checkScroll);

    // Use ResizeObserver to handle content changes
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, [groups]);

  return (
    <div className="relative">
      {showTopGradient && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 rounded-t-xl bg-gradient-to-b from-white to-transparent" />
      )}
      <div
        ref={scrollRef}
        className="flex max-h-[240px] flex-col gap-2 overflow-y-auto px-3 py-2"
      >
        {groups.map((group) => (
          <div key={group.id} className="flex items-center gap-2">
            <GroupColorCircle group={group} />
            <span className="font-regular text-sm text-neutral-700">
              {group.name}
            </span>
          </div>
        ))}
      </div>
      {showBottomGradient && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
      )}
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
    <div className="border-border-subtle rounded-xl border bg-white p-5">
      <div className="flex flex-col gap-5">
        <div className="flex h-[132px] animate-pulse items-center justify-center rounded-lg bg-neutral-100 px-32 py-4" />
        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-48 animate-pulse rounded-md bg-neutral-200" />
          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
