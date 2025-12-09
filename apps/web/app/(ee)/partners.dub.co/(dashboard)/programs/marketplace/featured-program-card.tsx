import { NetworkProgramProps } from "@/lib/types";
import { ProgramCategory } from "@/ui/partners/program-marketplace/program-category";
import { ProgramRewardsDisplay } from "@/ui/partners/program-marketplace/program-rewards-display";
import { Tooltip, useClickHandlers, useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { ProgramStatusBadge } from "./program-status-badge";

export function FeaturedProgramCard({
  program,
}: {
  program: NetworkProgramProps;
}) {
  const { queryParams } = useRouterStuff();
  const router = useRouter();

  const isDarkImage = program.marketplaceHeaderImage?.includes("-dark");

  return (
    <div
      className="border-border-subtle relative h-full cursor-pointer overflow-hidden rounded-xl border p-6"
      {...useClickHandlers(`/programs/marketplace/${program.slug}`, router)}
    >
      {program.marketplaceHeaderImage && (
        <>
          <img
            src={program.marketplaceHeaderImage}
            alt={program.name}
            className="absolute inset-0 size-full object-cover"
          />
          {!isDarkImage && (
            <div className="absolute inset-0 size-full bg-gradient-to-t from-white via-white/75 to-transparent xl:hidden" />
          )}
        </>
      )}

      <div className="relative">
        <div className="flex justify-between gap-4">
          <img
            src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="size-12 rounded-full border border-white/20"
          />

          <ProgramStatusBadge program={program} />
        </div>

        <div className="mt-10 flex flex-col">
          <span
            className={cn(
              "text-3xl font-semibold",
              isDarkImage && "text-content-inverted",
            )}
          >
            {program.name}
          </span>

          <div
            className={cn(
              "mt-1 line-clamp-2 max-w-sm text-sm",
              isDarkImage && "text-content-inverted",
            )}
          >
            {program.description ||
              `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
          </div>

          <div className="mt-5 flex gap-8">
            {Boolean(program.rewards?.length || program.discount) && (
              <div>
                <span
                  className={cn(
                    "text-content-subtle block text-xs font-medium",
                    isDarkImage && "text-content-inverted/80",
                  )}
                >
                  Rewards
                </span>
                <ProgramRewardsDisplay
                  rewards={program.rewards}
                  discount={program.discount}
                  isDarkImage={isDarkImage}
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
                  className="hover:bg-bg-default/10 active:bg-bg-default/20 mt-2"
                  iconClassName="hover:bg-bg-default/10 active:bg-bg-default/20"
                  descriptionClassName="max-w-[240px]"
                />
              </div>
            )}
            {Boolean(program.categories.length) && (
              <div className="min-w-0">
                <span
                  className={cn(
                    "text-content-subtle block text-xs font-medium",
                    isDarkImage && "text-content-inverted/80",
                  )}
                >
                  Category
                </span>
                <div className="mt-2 flex items-center gap-1.5">
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
                      className={cn(
                        "hover:bg-bg-default/10 active:bg-bg-default/20",
                        isDarkImage && "text-content-inverted",
                      )}
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
                      <div
                        className={cn(
                          "-ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium",
                          isDarkImage && "text-content-inverted/80",
                        )}
                      >
                        +{program.categories.length - 1}
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedProgramCardSkeleton() {
  return (
    <div className="border-border-subtle relative h-full overflow-hidden rounded-xl border p-6">
      <div className="relative">
        <div className="flex justify-between gap-4">
          <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
        </div>

        <div className="mt-10 flex flex-col">
          {/* Name - text-3xl font-semibold is typically ~36px height */}
          <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />

          {/* Description - text-sm single line, ~20px height */}
          <div className="mt-1 max-w-sm">
            <div className="h-5 w-64 animate-pulse rounded bg-neutral-200" />
          </div>

          {/* Rewards/Category section - matches actual card structure with mt-5 */}
          <div className="mt-5 flex gap-8">
            <div>
              <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
              <div className="mt-2 h-6 w-24 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
