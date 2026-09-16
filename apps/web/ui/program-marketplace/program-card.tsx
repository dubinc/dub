"use client";

import { NetworkProgramProps } from "@/lib/types";
import {
  MarketplaceRewardsLabel,
  ProgramRewardsDisplay,
} from "@/ui/program-marketplace/program-rewards-display";
import { getMarketplaceAllHref } from "@/ui/program-marketplace/utils/urls";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgramStatusBadge } from "./program-status-badge";

export function MarketplaceProgramCard({
  program,
  externalMarketplace = false,
  className,
}: {
  program: NetworkProgramProps;
  externalMarketplace?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const rewards = program.rewards;

  return (
    <Link
      href={`/marketplace/${program.slug}`}
      className={cn(
        "border-border-subtle hover:drop-shadow-card-hover flex h-full flex-col rounded-xl border bg-white p-4 transition-[filter] sm:p-6",
        className,
      )}
    >
      <div className="flex justify-between gap-4">
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-12 shrink-0 rounded-full object-cover"
        />

        {!externalMarketplace ? <ProgramStatusBadge program={program} /> : null}
      </div>

      <div className="mt-6 flex flex-col sm:mt-8">
        <h3 className="text-content-emphasis text-base font-semibold">
          {program.name}
        </h3>

        <div className="text-content-subtle mt-1 line-clamp-2 text-sm">
          {program.description ||
            `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
        </div>

        {rewards?.length ? (
          <div className="mt-5 min-w-0">
            <MarketplaceRewardsLabel
              count={rewards.length}
              className="text-content-muted text-xs font-medium"
            />
            <ProgramRewardsDisplay
              rewards={rewards}
              onRewardClick={(reward) =>
                router.push(getMarketplaceAllHref({ rewardType: reward.event }))
              }
              className="mt-2"
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function MarketplaceProgramCardSkeleton({
  className,
}: {
  className?: string;
} = {}) {
  return (
    <div
      className={cn(
        "border-border-subtle h-full rounded-xl border bg-white p-6",
        className,
      )}
    >
      <div className="flex justify-between gap-4">
        <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
      </div>

      <div className="mt-4 flex flex-col">
        {/* Name - text-base font-semibold is typically ~24px height */}
        <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />

        {/* Description - line-clamp-2 text-sm is 2 lines, ~28px total */}
        <div className="mt-1 flex flex-col gap-1">
          <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
        </div>

        {/* Rewards section - matches actual card structure */}
        <div className="mt-4 flex gap-4">
          <div>
            <div className="h-3.5 w-12 animate-pulse rounded bg-neutral-200" />
            <div className="mt-1 h-6 w-24 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
