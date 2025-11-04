import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Calendar6, Gift, Users } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";

export function BountyCard({ bounty }: { bounty: BountyListProps }) {
  const { slug: workspaceSlug } = useWorkspace();

  const { totalPartners, loading } = usePartnersCountByGroupIds({
    groupIds: bounty.groups.map((group) => group.id),
  });

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
              {bounty.submissionsCountData?.total === totalPartners ? (
                <>All</>
              ) : (
                <>
                  <span className="text-content-default">
                    {nFormatter(bounty.submissionsCountData?.total ?? 0, {
                      full: true,
                    })}
                  </span>{" "}
                  of
                </>
              )}{" "}
              {loading ? (
                <span className="inline-block h-4 w-8 animate-pulse rounded bg-neutral-200 align-middle" />
              ) : (
                <>
                  <span className="text-content-default">
                    {nFormatter(totalPartners, { full: true })}
                  </span>{" "}
                </>
              )}{" "}
              {pluralize(
                "partner",
                bounty.submissionsCountData?.total || totalPartners,
              )}{" "}
              {bounty.type === "performance" ? "completed" : "submitted"}
            </div>
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
