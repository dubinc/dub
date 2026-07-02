"use client";

import { NetworkProgramProps } from "@/lib/types";
import { ProgramCategory } from "@/ui/program-marketplace/program-category";
import { ProgramRewardsDisplay } from "@/ui/program-marketplace/program-rewards-display";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
  getMarketplaceProgramHref,
} from "@/ui/program-marketplace/utils/urls";
import { Tooltip } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgramStatusBadge } from "./program-status-badge";

export function MarketplaceProgramCard({
  program,
  showStatus = true,
  className,
}: {
  program: NetworkProgramProps;
  showStatus?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={getMarketplaceProgramHref(program.slug)}
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

        {showStatus ? <ProgramStatusBadge program={program} /> : null}
      </div>

      <div className="mt-6 flex flex-col sm:mt-8">
        <h3 className="text-content-emphasis text-base font-semibold">
          {program.name}
        </h3>

        <div className="text-content-subtle mt-1 line-clamp-2 text-sm">
          {program.description ||
            `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
        </div>

        <div className="mt-5 flex gap-4">
          {Boolean(program.rewards?.length) && (
            <div>
              <span className="text-content-muted block text-xs font-medium">
                Rewards
              </span>
              <ProgramRewardsDisplay
                rewards={program.rewards}
                onRewardClick={(reward) =>
                  router.push(
                    getMarketplaceAllHref({ rewardType: reward.event }),
                  )
                }
                className="mt-2"
              />
            </div>
          )}
          {Boolean(program.categories.length) && (
            <div className="hidden min-w-0 sm:block">
              <span className="text-content-muted block text-xs font-medium">
                Category
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                {program.categories
                  .slice(0, 1)
                  ?.map((category) => (
                    <ProgramCategory
                      key={category}
                      category={category}
                      onClick={() =>
                        router.push(getMarketplaceCategoryHref(category))
                      }
                    />
                  ))}
                {program.categories.length > 1 && (
                  <Tooltip
                    content={
                      <div className="flex flex-col gap-0.5 p-2">
                        {program.categories.slice(1).map((category) => (
                          <ProgramCategory
                            key={category}
                            category={category}
                            onClick={() =>
                              router.push(getMarketplaceCategoryHref(category))
                            }
                          />
                        ))}
                      </div>
                    }
                  >
                    <div className="text-content-subtle -ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium">
                      +{program.categories.length - 1}
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          )}
        </div>
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

        {/* Rewards/Category section - matches actual card structure */}
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
