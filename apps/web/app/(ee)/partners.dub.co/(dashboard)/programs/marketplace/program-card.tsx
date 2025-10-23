import { categoriesMap } from "@/lib/partners/categories";
import { NetworkProgramProps } from "@/lib/types";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { ProgramNetworkStatusBadges } from "@/ui/partners/partner-status-badges";
import { Category } from "@dub/prisma/client";
import {
  CircleInfo,
  Gift,
  Icon,
  Link4,
  StatusBadge,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import {
  OG_AVATAR_URL,
  cn,
  getPrettyUrl,
  isClickOnInteractiveChild,
} from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";
import { useRouter } from "next/navigation";

const getClickHandlers = (
  url: string | undefined,
  router: ReturnType<typeof useRouter>,
) => ({
  onClick: url
    ? (e) => {
        if (isClickOnInteractiveChild(e)) return;
        e.metaKey || e.ctrlKey ? window.open(url, "_blank") : router.push(url);
      }
    : undefined,
  onAuxClick: url
    ? (e) => {
        if (isClickOnInteractiveChild(e)) return;
        window.open(url, "_blank");
      }
    : undefined,
});

export function ProgramCard({ program }: { program?: NetworkProgramProps }) {
  const { queryParams } = useRouterStuff();
  const router = useRouter();

  const statusBadge = program?.status
    ? ProgramNetworkStatusBadges[program.status]
    : null;
  const url = program ? `/programs/${program.slug}` : undefined;

  return (
    <div
      className={cn(program?.id && "cursor-pointer hover:drop-shadow-sm")}
      {...getClickHandlers(url, router)}
    >
      <div className="border-border-subtle rounded-xl border bg-white p-6">
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

          <div className="text-content-default mt-1 flex items-center gap-1">
            <Link4 className="size-3.5" />
            {/* Domain */}
            {program ? (
              <a
                href={program.url || `https://${program.domain}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-medium"
              >
                {getPrettyUrl(program.url) || program.domain}
              </a>
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
                        <RewardOrDiscountIcon
                          key={reward.id}
                          icon={REWARD_EVENTS[reward.event].icon}
                          description={formatRewardDescription({ reward })}
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
                        <RewardOrDiscountIcon
                          icon={Gift}
                          description={formatDiscountDescription({
                            discount: program.discount,
                          })}
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
                      Industry
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {program.categories
                        .slice(0, 1)
                        ?.map((category) => (
                          <CategoryButton key={category} category={category} />
                        ))}
                      {program.categories.length > 1 && (
                        <Tooltip
                          content={
                            <div className="flex flex-col gap-0.5 p-2">
                              {program.categories.slice(1).map((category) => (
                                <CategoryButton
                                  key={category}
                                  category={category}
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
  const url = program ? `/programs/${program.slug}` : undefined;

  return (
    <div
      className={cn(
        "border-border-subtle relative overflow-hidden rounded-xl border p-6",
        program?.id &&
          "cursor-pointer border-transparent bg-black hover:drop-shadow-sm",
      )}
      {...getClickHandlers(url, router)}
    >
      {program?.marketplaceHeaderImage && (
        <img
          src={program.marketplaceHeaderImage}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80"
        />
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

        <div className="mt-4 flex flex-col">
          {/* Name */}
          {program ? (
            <span className="text-content-inverted text-3xl font-semibold">
              {program.name}
            </span>
          ) : (
            <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />
          )}

          <div className="text-content-inverted mt-1 flex items-center gap-1">
            <Link4 className="size-3.5" />
            {/* Domain */}
            {program ? (
              <a
                href={program.url || `https://${program.domain}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-medium"
              >
                {getPrettyUrl(program.url) || program.domain}
              </a>
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
                        <RewardOrDiscountIcon
                          key={reward.id}
                          icon={REWARD_EVENTS[reward.event].icon}
                          description={formatRewardDescription({ reward })}
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
                        <RewardOrDiscountIcon
                          icon={Gift}
                          description={formatDiscountDescription({
                            discount: program.discount,
                          })}
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
                      Industry
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {program.categories
                        .slice(0, 1)
                        ?.map((category) => (
                          <CategoryButton key={category} category={category} />
                        ))}
                      {program.categories.length > 1 && (
                        <Tooltip
                          content={
                            <div className="flex flex-col gap-0.5 p-2">
                              {program.categories.slice(1).map((category) => (
                                <CategoryButton
                                  key={category}
                                  category={category}
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
    </div>
  );
}

const RewardOrDiscountIcon = ({
  icon: Icon,
  description,
  onClick,
}: {
  icon: Icon;
  description: string;
  onClick: () => void;
}) => (
  <HoverCard.Root openDelay={100}>
    <HoverCard.Portal>
      <HoverCard.Content
        side="bottom"
        sideOffset={8}
        className="animate-slide-up-fade z-[99] flex items-center gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-xs text-neutral-700 shadow-sm"
      >
        <Icon className="text-content-default size-4" />
        <span>{description}</span>
      </HoverCard.Content>
    </HoverCard.Portal>
    <HoverCard.Trigger>
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-bg-subtle active:bg-bg-emphasis flex size-6 items-center justify-center rounded-md"
      >
        <Icon className="text-content-default size-4" />
      </button>
    </HoverCard.Trigger>
  </HoverCard.Root>
);

const CategoryButton = ({ category }: { category: Category }) => {
  const { queryParams } = useRouterStuff();
  const categoryData = categoriesMap[category];
  const { icon: Icon, label } = categoryData ?? {
    icon: CircleInfo,
    label: category.replace("_", " "),
  };

  return (
    <button
      type="button"
      onClick={() =>
        queryParams({
          set: {
            category,
          },
          del: "page",
        })
      }
      className="hover:bg-bg-subtle text-content-default active:bg-bg-emphasis flex h-6 min-w-0 items-center gap-1 rounded-md px-1"
    >
      <Icon className="size-4" />
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
    </button>
  );
};
