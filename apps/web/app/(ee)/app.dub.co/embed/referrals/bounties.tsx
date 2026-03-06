"use client";

import { PartnerBountyProps } from "@/lib/types";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "@/ui/partners/bounties/bounty-performance";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyStatusBadge } from "@/ui/partners/bounties/bounty-status-badge";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { TAB_ITEM_ANIMATION_SETTINGS, TimestampTooltip } from "@dub/ui";
import { Calendar6, Heart, Trophy } from "@dub/ui/icons";
import { fetcher, formatDate, formatDateTimeSmart } from "@dub/utils";
import { motion } from "motion/react";
import useSWR from "swr";
import { useEmbedToken } from "../use-embed-token";

interface ReferralsEmbedBountiesProps {
  onSelectBounty: (bountyId: string) => void;
}

export function ReferralsEmbedBounties({
  onSelectBounty,
}: ReferralsEmbedBountiesProps) {
  const token = useEmbedToken();

  const { data: bounties, isLoading } = useSWR<PartnerBountyProps[]>(
    "/api/embed/referrals/bounties",
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
      {bounties && bounties.length === 0 ? (
        <AnimatedEmptyState
          title="No bounties to collect"
          description={
            <>
              This program isn't offering any bounties at the moment.{" "}
              <a
                href="https://dub.co/help/article/program-bounties"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-content-default underline sm:whitespace-nowrap"
              >
                Learn more about bounties
              </a>
              .
            </>
          }
          cardContent={(idx) => {
            const Icon = [Trophy, Heart][idx % 2];
            return (
              <>
                <Icon className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              </>
            );
          }}
          className="border-none md:min-h-fit"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {bounties
            ? bounties.map((bounty) => (
                <EmbedBountyCard
                  key={bounty.id}
                  bounty={bounty}
                  onClick={() => onSelectBounty(bounty.id)}
                />
              ))
            : Array.from({ length: 4 }, (_, index) => (
                <EmbedBountyCardSkeleton key={index} />
              ))}
        </div>
      )}
    </motion.div>
  );
}

function EmbedBountyCard({
  bounty,
  onClick,
}: {
  bounty: PartnerBountyProps;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border-subtle group relative flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-shadow hover:shadow-md"
    >
      <div className="p-3 pb-0">
        <div className="relative flex h-[124px] items-center justify-center rounded-lg bg-neutral-100">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>
          <BountyStatusBadge bounty={bounty} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
        <h3 className="text-content-emphasis truncate text-sm font-semibold">
          {bounty.name}
        </h3>

        <EmbedBountyEndDate bounty={bounty} />

        <BountyRewardDescription
          bounty={bounty}
          onTooltipClick={(e) => e.stopPropagation()}
          className="font-medium"
        />
      </div>

      <div className="border-t border-neutral-200 px-5 py-4">
        {bounty.type === "performance" ? (
          <PerformanceBountyProgress bounty={bounty} />
        ) : (
          <SubmissionBountyProgress bounty={bounty} />
        )}
      </div>
    </button>
  );
}

function EmbedBountyEndDate({ bounty }: { bounty: PartnerBountyProps }) {
  const isExpired =
    bounty.endsAt && new Date(bounty.endsAt) < new Date() ? true : false;

  return (
    <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
      <Calendar6 className="size-3.5" />
      {bounty.endsAt ? (
        <span>
          {isExpired ? "Ended" : "Ends"} at{" "}
          <TimestampTooltip
            timestamp={bounty.endsAt}
            side="right"
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
  );
}

function EmbedBountyCardSkeleton() {
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
        </div>
      </div>
    </div>
  );
}
