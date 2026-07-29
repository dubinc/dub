import { getProgramBountyMeta } from "@/lib/bounty/bounty-period";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyListProps } from "@/lib/types";
import { BountyEligibilitySummary } from "@/ui/partners/bounties/bounty-eligibility-summary";
import {
  BountyProgressBarRow,
  EmphasisNumber,
} from "@/ui/partners/bounties/bounty-progress-bar-row";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Calendar6 } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize, pluck } from "@dub/utils";
import Link from "next/link";

export function BountyCard({ bounty }: { bounty: BountyListProps }) {
  const { slug: workspaceSlug } = useWorkspace();

  const { totalPartners, loading } = usePartnersCountByGroupIds({
    groupIds: pluck(bounty.groups, "id"),
    partnerTagIds: pluck(bounty.partnerTags, "id"),
  });

  const { dateRangeLabel } = getProgramBountyMeta(bounty);

  const submissionsCount = bounty.submissionsCountData?.total ?? 0;
  const progress =
    totalPartners > 0 ? (submissionsCount / totalPartners) * 100 : 0;

  return (
    <div className="border-border-subtle hover:border-border-default relative cursor-pointer rounded-xl border bg-white transition-all hover:shadow-lg">
      <Link
        href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
        className="flex flex-col"
      >
        <div className="flex flex-col gap-3.5 p-2 pb-0">
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

          <div className="flex flex-col gap-1.5 px-2 pb-3.5">
            <h3 className="text-content-emphasis text-sm font-semibold md:truncate">
              {bounty.name}
            </h3>

            <div className="text-content-subtle flex items-center gap-2 text-sm font-normal">
              <Calendar6 className="size-3.5" />
              <span>{dateRangeLabel}</span>
            </div>

            <BountyRewardDescription
              bounty={bounty}
              className="font-normal"
              onTooltipClick={(e) => e.preventDefault()}
            />

            <BountyEligibilitySummary
              groups={bounty.groups}
              partnerTags={bounty.partnerTags}
            />
          </div>
        </div>

        <div className="border-border-subtle border-t px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className="h-1 w-full animate-pulse rounded-full bg-neutral-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
            </div>
          ) : (
            <BountyProgressBarRow progress={progress}>
              <EmphasisNumber>
                {nFormatter(submissionsCount, { full: true })}
              </EmphasisNumber>{" "}
              of{" "}
              <EmphasisNumber>
                {nFormatter(totalPartners, { full: true })}
              </EmphasisNumber>{" "}
              {bounty.type === "performance" ? "completed" : "submitted"}
            </BountyProgressBarRow>
          )}
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
    <div className="border-border-subtle rounded-xl border bg-white">
      <div className="flex flex-col gap-3.5 p-2 pb-0">
        <div className="relative flex h-[124px] animate-pulse items-center justify-center rounded-lg bg-neutral-200" />
        <div className="flex flex-col gap-1.5 px-2 pb-3.5">
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
          <div className="flex h-5 items-center gap-2">
            <div className="size-3.5 shrink-0 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="flex h-5 items-center gap-2">
            <div className="size-3.5 shrink-0 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="flex h-5 items-center gap-2">
            <div className="size-3.5 shrink-0 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
      <div className="border-border-subtle border-t px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="h-1 w-full animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
