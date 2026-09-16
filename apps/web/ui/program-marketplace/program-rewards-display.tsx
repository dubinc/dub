import { DiscountProps, RewardProps } from "@/lib/types";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { Gift, Icon } from "@dub/ui";
import { cn } from "@dub/utils";

type RewardItem = {
  id: string;
  event: RewardProps["event"] | "discount";
  icon: Icon;
  description: string;
  onClick?: () => void;
};

export function MarketplaceRewardsLabel({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", className)}>
      Rewards
      {count > 1 ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-md bg-[#EDEDED] px-1 text-xs font-semibold leading-4 tracking-[-0.02em] text-[#404040]">
          {count}
        </span>
      ) : null}
    </span>
  );
}

interface ProgramRewardsDisplayProps {
  rewards?: RewardProps[] | null;
  discount?: DiscountProps | null;
  isDarkImage?: boolean;
  className?: string;
  onRewardClick?: (reward: RewardProps) => void;
  onDiscountClick?: (discount: DiscountProps) => void;
  descriptionClassName?: string;
}

export function ProgramRewardsDisplay({
  rewards,
  discount,
  isDarkImage = false,
  className,
  onRewardClick,
  onDiscountClick,
  descriptionClassName,
}: ProgramRewardsDisplayProps) {
  const items: RewardItem[] = [];

  if (rewards) {
    rewards.forEach((reward) => {
      items.push({
        id: reward.id,
        event: reward.event,
        icon: REWARD_EVENT_ICON[reward.event],
        description: formatRewardDescription(reward, {
          includeEarnPrefix: false,
        }),
        onClick: onRewardClick ? () => onRewardClick(reward) : undefined,
      });
    });
  }

  if (discount) {
    items.push({
      id: "discount",
      event: "discount",
      icon: Gift,
      description: formatDiscountDescription(discount),
      onClick: onDiscountClick ? () => onDiscountClick(discount) : undefined,
    });
  }

  if (items.length === 0) return null;

  const featuredItem =
    items.find((item) => item.event === "sale") ??
    items.find((item) => item.event === "lead") ??
    items.find((item) => item.event === "click") ??
    items[0];

  return (
    <div className={cn("w-full min-w-0", className)}>
      <RewardExpandedItem
        item={featuredItem}
        isDarkImage={isDarkImage}
        descriptionClassName={descriptionClassName}
      />
    </div>
  );
}

function RewardExpandedItem({
  item,
  isDarkImage,
  descriptionClassName,
}: {
  item: RewardItem;
  isDarkImage: boolean;
  descriptionClassName?: string;
}) {
  const As = item.onClick ? "button" : "div";

  return (
    <As
      {...(item.onClick && {
        type: "button",
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.onClick?.();
        },
      })}
      className={cn(
        "flex min-w-0 max-w-full items-center gap-1 overflow-hidden pr-1",
        item.onClick &&
          "hover:bg-bg-subtle active:bg-bg-emphasis rounded-md transition-colors",
      )}
    >
      <div
        className={cn(
          "text-content-default flex size-6 shrink-0 items-center justify-center rounded-md",
          isDarkImage && "text-content-inverted",
        )}
      >
        <item.icon className="size-4" />
      </div>
      <span
        className={cn(
          "min-w-0 max-w-full truncate text-sm font-normal leading-5 tracking-[-0.02em] text-black",
          isDarkImage && "text-content-inverted",
          descriptionClassName,
        )}
      >
        {item.description}
      </span>
    </As>
  );
}
