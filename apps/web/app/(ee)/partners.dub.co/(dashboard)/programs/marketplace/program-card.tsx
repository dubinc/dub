import { NetworkProgramProps } from "@/lib/types";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { ProgramNetworkStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramCategory } from "@/ui/partners/program-network/program-category";
import { ProgramRewardIcon } from "@/ui/partners/program-network/program-reward-icon";
import { Gift, StatusBadge, Tooltip, useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL, cn, isClickOnInteractiveChild } from "@dub/utils";
import { useRouter } from "next/navigation";

const getClickHandlers = (
  url: string | undefined,
  router: ReturnType<typeof useRouter>,
) =>
  url
    ? {
        onClick: (e) => {
          if (isClickOnInteractiveChild(e)) return;
          e.metaKey || e.ctrlKey
            ? window.open(url, "_blank")
            : router.push(url);
        },
        onAuxClick: (e) => {
          if (isClickOnInteractiveChild(e)) return;
          window.open(url, "_blank");
        },
        role: "link",
        tabIndex: 0,
        onKeyDown: (e) =>
          e.target === e.currentTarget && e.key === "Enter" && router.push(url),
      }
    : {};

export function ProgramCard({ program }: { program?: NetworkProgramProps }) {
  const { queryParams } = useRouterStuff();
  const router = useRouter();

  const statusBadge = program?.status
    ? ProgramNetworkStatusBadges[program.status]
    : null;
  const url = program ? `/programs/marketplace/${program.slug}` : undefined;

  return (
    <div
      className={cn(
        program?.id &&
          "border-border-subtle hover:drop-shadow-card-hover cursor-pointer rounded-xl border bg-white p-6 transition-[filter]",
      )}
      {...getClickHandlers(url, router)}
    >
      <div className="flex justify-between gap-4">
        {program ? (
          <img
            src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="size-12 rounded-full"
          />
        ) : (
          <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
        )}

        {statusBadge && (
          <StatusBadge {...statusBadge} className="px-1.5 py-0.5">
            {statusBadge.label}
          </StatusBadge>
        )}
      </div>

      <div className="mt-4 flex flex-col">
        {/* Name */}
        {program ? (
          <span className="text-content-emphasis text-base font-semibold">
            {program.name}
          </span>
        ) : (
          <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
        )}

        <div className="text-content-subtle mt-1 text-sm">
          {/* Domain */}
          {program ? (
            `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`
          ) : (
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
          )}
        </div>

        <div className="mt-4 flex gap-8">
          {program ? (
            <>
              {Boolean(program?.rewards?.length || program?.discount) && (
                <div>
                  <span className="text-content-muted block text-xs font-medium">
                    Rewards
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {program.rewards?.map((reward) => (
                      <ProgramRewardIcon
                        key={reward.id}
                        icon={REWARD_EVENTS[reward.event].icon}
                        description={formatRewardDescription(reward)}
                        onClick={() =>
                          queryParams({
                            set: {
                              rewardType: reward.event,
                            },
                            del: "page",
                          })
                        }
                      />
                    ))}
                    {program.discount && (
                      <ProgramRewardIcon
                        icon={Gift}
                        description={formatDiscountDescription(
                          program.discount,
                        )}
                        onClick={() =>
                          queryParams({
                            set: {
                              rewardType: "discount",
                            },
                            del: "page",
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              )}
              {Boolean(program?.categories?.length) && (
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
            </>
          ) : (
            <div>
              <div className="h-3.5 w-12 animate-pulse rounded bg-neutral-200" />
              <div className="mt-1 h-6 w-24 animate-pulse rounded bg-neutral-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeaturedProgramCard({
  program,
}: {
  program?: NetworkProgramProps;
}) {
  const { queryParams } = useRouterStuff();
  const router = useRouter();

  const statusBadge = program?.status
    ? ProgramNetworkStatusBadges[program.status]
    : null;
  const url = program ? `/programs/marketplace/${program.slug}` : undefined;
  const darkImage = program?.marketplaceHeaderImage?.includes("-dark");

  return (
    <div
      className="border-border-subtle relative h-full cursor-pointer overflow-hidden rounded-xl border p-6"
      {...getClickHandlers(url, router)}
    >
      {program?.marketplaceHeaderImage && (
        <>
          <img
            src={program.marketplaceHeaderImage}
            alt={program.name}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0" />
        </>
      )}

      <div className="relative">
        <div className="flex justify-between gap-4">
          {program ? (
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="size-12 rounded-full"
            />
          ) : (
            <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
          )}

          {statusBadge && (
            <StatusBadge {...statusBadge} className="px-1.5 py-0.5">
              {statusBadge.label}
            </StatusBadge>
          )}
        </div>

        <div className="mt-10 flex flex-col">
          {/* Name */}
          {program ? (
            <span
              className={cn(
                "text-3xl font-semibold",
                darkImage && "text-content-inverted",
              )}
            >
              {program.name}
            </span>
          ) : (
            <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />
          )}

          <div
            className={cn(
              "mt-1 max-w-md text-sm",
              darkImage && "text-content-inverted",
            )}
          >
            {/* Description */}
            {program ? (
              `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`
            ) : (
              <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
            )}
          </div>

          <div className="mt-5 flex gap-8">
            {program ? (
              <>
                {Boolean(program?.rewards?.length || program?.discount) && (
                  <div>
                    <span
                      className={cn(
                        "text-content-subtle block text-xs font-medium",
                        darkImage && "text-content-inverted",
                      )}
                    >
                      Rewards
                    </span>
                    <div className="mt-2 flex items-center gap-1.5">
                      {program.rewards?.map((reward) => (
                        <ProgramRewardIcon
                          key={reward.id}
                          icon={REWARD_EVENTS[reward.event].icon}
                          description={formatRewardDescription(reward)}
                          onClick={() =>
                            queryParams({
                              set: {
                                rewardType: reward.event,
                              },
                              del: "page",
                            })
                          }
                          className={cn(
                            "hover:bg-bg-default/10 active:bg-bg-default/20",
                            darkImage && "text-content-inverted",
                          )}
                        />
                      ))}
                      {program.discount && (
                        <ProgramRewardIcon
                          icon={Gift}
                          description={formatDiscountDescription(
                            program.discount,
                          )}
                          onClick={() =>
                            queryParams({
                              set: {
                                rewardType: "discount",
                              },
                              del: "page",
                            })
                          }
                          className={cn(
                            "hover:bg-bg-default/10 active:bg-bg-default/20",
                            darkImage && "text-content-inverted",
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}
                {Boolean(program?.categories?.length) && (
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "text-content-subtle block text-xs font-medium",
                        darkImage && "text-content-muted",
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
                            darkImage && "text-content-inverted",
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
                              darkImage && "text-content-inverted/70",
                            )}
                          >
                            +{program.categories.length - 1}
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
                <div className="mt-2 h-6 w-24 animate-pulse rounded bg-neutral-200" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
