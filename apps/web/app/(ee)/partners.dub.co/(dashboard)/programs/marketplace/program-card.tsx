import { NetworkProgramProps } from "@/lib/types";
import { ProgramCategory } from "@/ui/partners/program-marketplace/program-category";
import { ProgramRewardsDisplay } from "@/ui/partners/program-marketplace/program-rewards-display";
import { Tooltip, useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";
import { ProgramStatusBadge } from "./program-status-badge";

export function ProgramCard({ program }: { program: NetworkProgramProps }) {
  const { queryParams } = useRouterStuff();

  return (
    <Link
      href={`/programs/marketplace/${program.slug}`}
      className="border-border-subtle hover:drop-shadow-card-hover rounded-xl border bg-white p-6 transition-[filter]"
    >
      <div className="flex justify-between gap-4">
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-12 rounded-full"
        />

        <ProgramStatusBadge program={program} />
      </div>

      <div className="mt-4 flex flex-col">
        <span className="text-content-emphasis text-base font-semibold">
          {program.name}
        </span>

        <div className="text-content-subtle mt-1 line-clamp-2 text-sm">
          {program.description ||
            `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
        </div>

        <div className="mt-4 flex gap-4">
          {Boolean(program.rewards?.length || program.discount) && (
            <div>
              <span className="text-content-muted block text-xs font-medium">
                Rewards
              </span>
              <ProgramRewardsDisplay
                rewards={program.rewards}
                discount={program.discount}
                onRewardClick={(reward) =>
                  queryParams({
                    set: {
                      rewardType: reward.event,
                    },
                    del: "page",
                  })
                }
                onDiscountClick={() =>
                  queryParams({
                    set: {
                      rewardType: "discount",
                    },
                    del: "page",
                  })
                }
                className="mt-1"
              />
            </div>
          )}
          {Boolean(program.categories.length) && (
            <div className="min-w-0">
              <span className="text-content-muted block text-xs font-medium">
                Category
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                {program.categories.slice(0, 1)?.map((category) => (
                  <ProgramCategory
                    key={category}
                    category={category}
                    onClick={() =>
                      queryParams({
                        set: {
                          category,
                        },
                        del: "page",
                      })
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
                              queryParams({
                                set: {
                                  category,
                                },
                                del: "page",
                              })
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

export function ProgramCardSkeleton() {
  return (
    <div className="border-border-subtle rounded-xl border bg-white p-6">
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
