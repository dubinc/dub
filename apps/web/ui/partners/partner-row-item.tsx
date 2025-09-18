import { DynamicTooltipWrapper } from "@dub/ui";
import { CursorRays, InvoiceDollar, UserPlus, Gift } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { OG_AVATAR_URL } from "@dub/utils/src/constants";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGroupRewardsAndDiscount } from "@/lib/partners/get-group-rewards-and-discount";
import { GroupProps, RewardProps, DiscountProps } from "@/lib/types";

export function PartnerRowItem({
  partner,
  group,
  showPermalink = true,
}: {
  partner: {
    id: string;
    name: string;
    image?: string | null;
  };
  group?: GroupProps | null;
  showPermalink?: boolean;
}) {
  const { slug } = useParams();
  const As = showPermalink ? Link : "div";

  // Helper function to format reward amount
  const formatRewardAmount = (reward: RewardProps) => {
    if (reward.type === "percentage") {
      return `${reward.amount}%`;
    }
    return `$${(reward.amount / 100).toFixed(2)}`;
  };

  // Helper function to get duration text
  const getDurationText = (maxDuration?: number | null) => {
    if (maxDuration === 0) return "one-time";
    if (maxDuration == null) return "for the customer's lifetime";
    return `for ${maxDuration} month${maxDuration > 1 ? 's' : ''}`;
  };

  // Helper function to get reward description
  const getRewardDescription = (reward: RewardProps) => {
    const amount = formatRewardAmount(reward);
    const duration = getDurationText(reward.maxDuration);
    
    switch (reward.event) {
      case "sale":
        return `Up to ${amount} per sale ${duration}`;
      case "lead":
        return `${amount} per lead`;
      case "click":
        return `${amount} per click`;
      default:
        return `${amount} per ${reward.event}`;
    }
  };

  // Get group rewards and discount
  const { rewards, discount } = group ? getGroupRewardsAndDiscount(group) : { rewards: [], discount: null };

  // Sort rewards in the specified order: sale, lead, click
  const sortedRewards = rewards.sort((a, b) => {
    const order = { sale: 0, lead: 1, click: 2 } as const;
    return (order[a.event as keyof typeof order] ?? 999) - (order[b.event as keyof typeof order] ?? 999);
  });

  // Icon mapping for rewards
  const getRewardIcon = (event: string) => {
    switch (event) {
      case "sale":
        return InvoiceDollar;
      case "lead":
        return UserPlus;
      case "click":
        return CursorRays;
      default:
        return CursorRays;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DynamicTooltipWrapper
        tooltipProps={
          group && (rewards.length > 0 || discount)
            ? {
                delayDuration: 300,
                content: (
                  <div className="grid max-w-xs gap-1 p-2">
                    {sortedRewards.map((reward) => {
                      const Icon = getRewardIcon(reward.event);
                      
                      return (
                        <div key={reward.id} className="flex items-start gap-2">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                            <Icon className="size-4" />
                          </div>
                          <span className="text-xs font-medium text-neutral-700 mt-1">
                            {getRewardDescription(reward)}
                          </span>
                        </div>
                      );
                    })}
                    {discount && (
                      <div className="flex items-start gap-2">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                          <Gift className="size-4" />
                        </div>
                        <span className="text-xs font-medium text-neutral-700 mt-1">
                          New users get {discount.type === "percentage" ? `${discount.amount}%` : `$${(discount.amount / 100).toFixed(0)}`} off {getDurationText(discount.maxDuration)}
                        </span>
                      </div>
                    )}
                  </div>
                ),
              }
            : undefined
        }
      >
        <div className="relative shrink-0">
          <img
            src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
            alt={partner.name}
            className="size-5 shrink-0 rounded-full"
          />
        </div>
      </DynamicTooltipWrapper>
      <As
        {...(showPermalink && {
          href: `/${slug}/program/partners?partnerId=${partner.id}`,
          target: "_blank",
          rel: "noopener noreferrer",
        })}
        className={cn(
          "min-w-0 truncate",
          showPermalink && "cursor-alias decoration-dotted hover:underline",
        )}
        title={partner.name}
      >
        {partner.name}
      </As>
    </div>
  );
}
