"use client";

import { PartnerBountyProps } from "@/lib/types";
import { BountyDescription } from "@/ui/partners/bounties/bounty-description";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "@/ui/partners/bounties/bounty-performance";
import { BountyRewardCriteria } from "@/ui/partners/bounties/bounty-reward-criteria";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyStatusBadge } from "@/ui/partners/bounties/bounty-status-badge";
import { BountySubmissionRequirements } from "@/ui/partners/bounties/bounty-submission-requirements";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { TAB_ITEM_ANIMATION_SETTINGS, TimestampTooltip, Trophy } from "@dub/ui";
import { Calendar6 } from "@dub/ui/icons";
import { fetcher, formatDate, formatDateTimeSmart } from "@dub/utils";
import { motion } from "motion/react";
import useSWR from "swr";
import { BountySubmissionsTable } from "../../../partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/[bountyId]/bounty-submissions-table";
import { useEmbedToken } from "../use-embed-token";

interface ReferralsEmbedBountyDetailProps {
  bountyId: string;
  onBack: () => void;
}

export function ReferralsEmbedBountyDetail({
  bountyId,
  onBack,
}: ReferralsEmbedBountyDetailProps) {
  const token = useEmbedToken();

  const { data: bounty, isLoading } = useSWR<PartnerBountyProps>(
    `/api/embed/referrals/bounties/${bountyId}`,
    (url) =>
      fetcher(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    {
      keepPreviousData: true,
    },
  );

  return (
    <motion.div {...TAB_ITEM_ANIMATION_SETTINGS}>
      <div className="border-border-subtle overflow-hidden rounded-xl border bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="text-content-subtle size-4" />
            <span className="text-content-emphasis text-sm font-semibold">
              Bounty details
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="border-border-subtle hover:bg-bg-muted text-content-default rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-100"
          >
            Back
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          {/* Left: main content */}
          <div className="flex flex-col gap-6">
            {isLoading ? (
              <BountyDetailsProgressSkeleton />
            ) : bounty ? (
              <>
                <div className="flex flex-col gap-3">
                  <h2 className="text-content-emphasis text-sm font-semibold">
                    Progress
                  </h2>
                  <div className="border-border-subtle flex w-full flex-col gap-4 rounded-xl border px-5 pb-4 pt-6">
                    {bounty.type === "performance" ? (
                      <PerformanceBountyProgress bounty={bounty} />
                    ) : (
                      <SubmissionBountyProgress bounty={bounty} />
                    )}
                  </div>
                </div>

                <BountySubmissionsTable bounty={bounty} />

                <div className="flex flex-col gap-6 text-sm">
                  <BountySubmissionRequirements bounty={bounty} />
                  <BountyRewardCriteria bounty={bounty} />
                  <BountyDescription bounty={bounty} />
                </div>
              </>
            ) : null}
          </div>

          {/* Right: bounty info (no card wrapper) */}
          <div>
            {isLoading ? (
              <BountyInfoSkeleton />
            ) : bounty ? (
              <BountyInfo bounty={bounty} />
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BountyInfo({ bounty }: { bounty: PartnerBountyProps }) {
  const isExpired =
    bounty.endsAt && new Date(bounty.endsAt) < new Date() ? true : false;

  return (
    <div className="flex flex-col gap-3">
      {/* Thumbnail */}
      <div className="relative flex h-[160px] items-center justify-center rounded-xl bg-neutral-100">
        <div className="relative size-full">
          <BountyThumbnailImage bounty={bounty} />
        </div>
        <BountyStatusBadge bounty={bounty} />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <h3 className="text-content-emphasis text-sm font-semibold">
          {bounty.name}
        </h3>

        <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
          <Calendar6 className="size-3.5 shrink-0" />
          {bounty.endsAt ? (
            <span>
              {isExpired ? "Ended" : "Ends"} at{" "}
              <TimestampTooltip
                timestamp={bounty.endsAt}
                side="left"
                rows={["local", "utc"]}
              >
                <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
                  {formatDateTimeSmart(bounty.endsAt)}
                </span>
              </TimestampTooltip>
            </span>
          ) : (
            <span>
              {formatDate(bounty.startsAt, { month: "short" })} → No end date
            </span>
          )}
        </div>

        <BountyRewardDescription bounty={bounty} className="font-medium" />
      </div>
    </div>
  );
}

function BountyDetailsProgressSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-5 w-20 animate-pulse rounded-md bg-neutral-200" />
      <div className="border-border-subtle flex flex-col gap-4 rounded-xl border px-5 pb-4 pt-6">
        <div className="h-1 w-full animate-pulse rounded-full bg-neutral-200" />
        <div className="flex gap-1">
          <div className="h-6 w-8 animate-pulse rounded bg-neutral-200" />
          <div className="h-6 w-6 animate-pulse rounded bg-neutral-200" />
          <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

function BountyInfoSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-[160px] animate-pulse rounded-xl bg-neutral-100" />
      <div className="flex flex-col gap-1.5">
        <div className="h-5 w-48 animate-pulse rounded-md bg-neutral-200" />
        <div className="flex h-5 items-center gap-2">
          <div className="size-3.5 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}
