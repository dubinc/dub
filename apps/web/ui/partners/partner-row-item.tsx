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

  // Helper function to get reward description
  const getRewardDescription = (reward: RewardProps) => {
    const amount = formatRewardAmount(reward);
    const duration = reward.maxDuration 
      ? reward.maxDuration === 0 
        ? "one-time" 
        : `for ${reward.maxDuration} month${reward.maxDuration > 1 ? 's' : ''}`
      : "lifetime";
    
    switch (reward.event) {
      case "sale":
        return `Up to ${amount} per sale ${duration}`;
      case "lead":
        return `$${(reward.amount / 100).toFixed(0)} per lead`;
      case "click":
        return `$${(reward.amount / 100).toFixed(2)} per click`;
      default:
        return `${amount} per ${reward.event}`;
    }
  };

  // Get group rewards and discount
  const { rewards, discount } = group ? getGroupRewardsAndDiscount(group) : { rewards: [], discount: null };

  return (
    <div className="flex items-center gap-2">
      <DynamicTooltipWrapper
        tooltipProps={
          group && (rewards.length > 0 || discount)
            ? {
                content: (
                  <div className="grid max-w-xs gap-1 p-2">
                    {rewards.map((reward) => {
                      const Icon = reward.event === "sale" ? InvoiceDollar 
                                  : reward.event === "lead" ? UserPlus 
                                  : CursorRays;
                      
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
                          New users get {discount.type === "percentage" ? `${discount.amount}%` : `$${(discount.amount / 100).toFixed(0)}`} off {discount.maxDuration ? `for ${discount.maxDuration} month${discount.maxDuration > 1 ? 's' : ''}` : 'lifetime'}
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
        href={`/${slug}/program/partners?partnerId=${partner.id}`}
        {...(showPermalink && { target: "_blank" })}
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
