import { DiscountProps, RewardProps } from "@/lib/types";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { Gift, Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";
import { ProgramRewardIcon } from "./program-reward-icon";

type RewardItem = {
  id: string;
  icon: Icon;
  description: string;
  onClick?: () => void;
};

interface ProgramRewardsDisplayProps {
  rewards?: RewardProps[] | null;
  discount?: DiscountProps | null;
  isDarkImage?: boolean;
  className?: string;
  onRewardClick?: (reward: RewardProps) => void;
  onDiscountClick?: (discount: DiscountProps) => void;
  iconClassName?: string;
  descriptionClassName?: string;
}

export function ProgramRewardsDisplay({
  rewards,
  discount,
  isDarkImage = false,
  className,
  onRewardClick,
  onDiscountClick,
  iconClassName,
  descriptionClassName,
}: ProgramRewardsDisplayProps) {
  // Concatenate rewards and discount into a single array
  const items: RewardItem[] = [];

  // Add rewards
  if (rewards) {
    rewards.forEach((reward) => {
      items.push({
        id: reward.id,
        icon: REWARD_EVENTS[reward.event].icon,
        description: formatRewardDescription(reward),
        onClick: onRewardClick ? () => onRewardClick(reward) : undefined,
      });
    });
  }

  // Add discount if present
  if (discount) {
    items.push({
      id: "discount",
      icon: Gift,
      description: formatDiscountDescription(discount),
      onClick: onDiscountClick ? () => onDiscountClick(discount) : undefined,
    });
  }

  // shouldn't happen, but just in case
  if (items.length === 0) return null;

  // If there's only one item, show the full description
  if (items.length === 1) {
    const item = items[0];
    const As = item.onClick ? "button" : "div";
    return (
      <HoverCard.Root openDelay={100}>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            sideOffset={8}
            className="animate-slide-up-fade z-[99] flex items-center gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-xs text-neutral-700 shadow-sm"
          >
            <item.icon className="text-content-default size-4" />
            <span>{item.description}</span>
          </HoverCard.Content>
        </HoverCard.Portal>
        <HoverCard.Trigger>
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
              "-ml-1 flex items-center gap-1 pr-1",
              item.onClick &&
                "hover:bg-bg-subtle active:bg-bg-emphasis rounded-md transition-colors",
              className,
            )}
          >
            <div
              className={cn(
                "text-content-default flex size-6 items-center justify-center rounded-md",
                isDarkImage && "text-content-inverted",
              )}
            >
              <item.icon className="size-4" />
            </div>
            <span
              className={cn(
                "text-content-default max-w-[160px] truncate text-sm font-medium",
                isDarkImage && "text-content-inverted",
                descriptionClassName,
              )}
            >
              {item.description}
            </span>
          </As>
        </HoverCard.Trigger>
      </HoverCard.Root>
    );
  }

  // If there are multiple items, show icons with tooltips
  return (
    <div className={cn("-ml-1 flex items-center gap-1.5", className)}>
      {items.map((item) => (
        <ProgramRewardIcon
          key={item.id}
          icon={item.icon}
          description={item.description}
          onClick={item.onClick}
          className={cn(isDarkImage && "text-content-inverted", iconClassName)}
        />
      ))}
    </div>
  );
}
