import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Calendar6, Gift, Users } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

export function BountyCard({ bounty }: { bounty: BountyListProps }) {
  const { slug: workspaceSlug } = useWorkspace();
  const { partnersCount: groupCount } = usePartnersCount<
    | {
        groupId: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "groupId",
  });

  const totalPartnersForBounty = useMemo(() => {
    if (bounty.groups.length === 0) {
      // if no groups set, return all partners
      return groupCount?.reduce((acc, curr) => acc + curr._count, 0) ?? 0;
    }

    return (
      groupCount?.reduce((acc, curr) => {
        if (bounty.groups.some((group) => group.id === curr.groupId)) {
          return acc + curr._count;
        }

        return acc;
      }, 0) ?? 0
    );
  }, [groupCount, bounty.groups]);

  return (
    <div className="border-border-subtle hover:border-border-default relative cursor-pointer rounded-xl border bg-white p-5 transition-all hover:shadow-lg">
      <Link
        href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
        className="flex flex-col gap-5"
      >
        <div className="relative flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>

          {/* {bounty.pendingSubmissions > 0 ? (
            <SubmissionsCountBadge count={bounty.pendingSubmissions} />
          ) : null} */}
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-content-emphasis truncate text-sm font-semibold">
            {bounty.name}
          </h3>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
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

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Gift className="size-3.5 shrink-0" />
            <span className="truncate">
              {getBountyRewardDescription(bounty)}
            </span>
          </div>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Users className="size-3.5" />
            <div className="h-5">
              {bounty.submissionsCount === totalPartnersForBounty ? (
                <>All</>
              ) : (
                <>
                  <span className="text-content-default">
                    {nFormatter(bounty.submissionsCount, { full: true })}
                  </span>{" "}
                  of
                </>
              )}{" "}
              <span className="text-content-default">
                {nFormatter(totalPartnersForBounty, { full: true })}
              </span>{" "}
              {pluralize("partner", totalPartnersForBounty)} completed
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function SubmissionsCountBadge({ count }: { count: number }) {
  return (
    <div className="absolute left-2 top-2 z-10">
      <div className="flex h-5 items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
        {count} {pluralize("submission", count)}
      </div>
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
