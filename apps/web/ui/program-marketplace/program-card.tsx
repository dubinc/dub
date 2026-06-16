import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { NetworkProgramProps } from "@/lib/types";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { ProgramCategory } from "@/ui/program-marketplace/program-category";
import { getMarketplaceProgramHref } from "@/ui/program-marketplace/utils/urls";
import { Gift, type Icon } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import Link from "next/link";
import { ProgramStatusBadge } from "./program-status-badge";

// Non-interactive, server-renderable card. The whole card is a single <Link>;
// the category/reward/`+N` are plain, non-interactive labels. Do NOT add nested
// links/buttons/Radix triggers inside the card — interactive content inside an
// <a> is invalid HTML and breaks server rendering (the browser reparents it).
export function MarketplaceProgramCard({
  program,
  showStatus = true,
  className,
}: {
  program: NetworkProgramProps;
  showStatus?: boolean;
  className?: string;
}) {
  const hiddenCategoryLabels = program.categories
    .slice(1)
    .map(getProgramCategoryLabel);

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
          {Boolean(program.rewards?.length || program.discount) && (
            <div>
              <span className="text-content-muted block text-xs font-medium">
                Rewards
              </span>
              <MarketplaceProgramCardRewards program={program} />
            </div>
          )}
          {Boolean(program.categories.length) && (
            <div className="hidden min-w-0 sm:block">
              <span className="text-content-muted block text-xs font-medium">
                Category
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                <ProgramCategory
                  category={program.categories[0]}
                  variant="default"
                />
                {program.categories.length > 1 && (
                  <div
                    className="text-content-subtle -ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium"
                    title={hiddenCategoryLabels.join(", ")}
                  >
                    +{program.categories.length - 1}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function getProgramCategoryLabel(
  category: NetworkProgramProps["categories"][number],
) {
  return (
    PROGRAM_CATEGORIES_MAP[category]?.label ?? category.replaceAll("_", " ")
  );
}

// Mirrors ProgramRewardsDisplay's resting appearance (reward icon + truncated
// description) but without the Radix HoverCard trigger, so it's a valid,
// non-interactive descendant of the card's <a>.
function MarketplaceProgramCardRewards({
  program,
}: {
  program: NetworkProgramProps;
}) {
  const items: { id: string; icon: Icon; description: string }[] = [];

  program.rewards?.forEach((reward) => {
    items.push({
      id: reward.id,
      icon: REWARD_EVENT_ICON[reward.event],
      description: formatRewardDescription(reward, {
        includeEarnPrefix: false,
      }),
    });
  });

  if (program.discount) {
    items.push({
      id: "discount",
      icon: Gift,
      description: formatDiscountDescription(program.discount),
    });
  }

  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    const item = items[0];
    const RewardIcon = item.icon;

    return (
      <div className="-ml-1 mt-2 flex items-center gap-1 pr-1">
        <div className="text-content-default flex size-6 items-center justify-center rounded-md">
          <RewardIcon className="size-4" />
        </div>
        <span className="text-content-default max-w-[120px] truncate text-sm font-medium sm:max-w-[160px]">
          {item.description}
        </span>
      </div>
    );
  }

  return (
    <div className="-ml-1 mt-2 flex min-h-6 items-center gap-1.5">
      {items.map((item) => {
        const RewardIcon = item.icon;

        return (
          <div
            key={item.id}
            className="text-content-default flex size-6 items-center justify-center rounded-md"
          >
            <RewardIcon className="size-4" />
          </div>
        );
      })}
    </div>
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
