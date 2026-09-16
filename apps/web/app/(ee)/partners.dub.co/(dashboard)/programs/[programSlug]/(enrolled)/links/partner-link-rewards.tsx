"use client";

import {
  getPartnerLinkDisplayRewards,
  getPartnerLinkPrimaryIncentive,
} from "@/lib/rewards/resolve-partner-link-rewards";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerProfileLinkProps } from "@/lib/types";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { ProgramRewardModifiersTooltip } from "@/ui/partners/program-reward-modifiers-tooltip";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { Icon, Tooltip } from "@dub/ui";
import { DiscountCode, Gift } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";

export function usePartnerLinkRewards(link: PartnerProfileLinkProps) {
  const { programEnrollment } = useProgramEnrollment();

  return useMemo(() => {
    const { rewards, discount } = getPartnerLinkDisplayRewards({
      clickReward: link.clickReward,
      leadReward: link.leadReward,
      saleReward: link.saleReward,
      discount: link.discount,
      enrollmentRewards: programEnrollment?.rewards ?? [],
    });

    const { primaryReward, primaryDiscount, additionalCount } =
      getPartnerLinkPrimaryIncentive({ rewards, discount });

    const primaryText = primaryReward
      ? formatRewardDescription(primaryReward, { includeEarnPrefix: false })
      : primaryDiscount
        ? formatDiscountDescription(primaryDiscount)
        : null;

    return {
      rewards,
      discount,
      primaryReward,
      primaryDiscount,
      primaryText,
      additionalCount,
      hasIncentives: rewards.length > 0 || Boolean(discount),
    };
  }, [
    link.clickReward,
    link.leadReward,
    link.saleReward,
    link.discount,
    programEnrollment?.rewards,
  ]);
}

export function usePartnerLinkRewardsState() {
  const [showRewards, setShowRewards] = useState(false);

  return {
    showRewards,
    setShowRewards,
    toggleRewards: () => setShowRewards((value) => !value),
  };
}

export function PartnerLinkRewardsSummary({
  primaryText,
  additionalCount,
  showRewards,
  onToggleRewards,
}: {
  primaryText: string;
  additionalCount: number;
  showRewards: boolean;
  onToggleRewards: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 pl-0.5">
      <Gift className="size-3.5 shrink-0 text-neutral-500" />
      <p className="truncate text-sm font-medium tracking-tight text-neutral-500">
        {primaryText}
      </p>
      {additionalCount > 0 && (
        <Tooltip content="View rewards">
          <button
            type="button"
            onClick={onToggleRewards}
            aria-expanded={showRewards}
            className={cn(
              "inline-flex h-4 shrink-0 items-center justify-center rounded-md bg-blue-100 px-1.5 text-xs font-semibold leading-4 tracking-tight text-blue-700 transition-colors",
              showRewards && "bg-blue-200",
            )}
          >
            +{additionalCount}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export function PartnerLinkRewardsPanel({
  rewards,
  discount,
  showRewards,
  additionalCount,
}: {
  rewards: ReturnType<typeof usePartnerLinkRewards>["rewards"];
  discount: ReturnType<typeof usePartnerLinkRewards>["discount"];
  showRewards: boolean;
  additionalCount: number;
}) {
  if (additionalCount === 0) {
    return null;
  }

  const items: {
    id: string;
    icon: Icon;
    text: ReactNode;
  }[] = [
    ...rewards.map((reward) => ({
      id: reward.id,
      icon: REWARD_EVENT_ICON[reward.event],
      text: (
        <>
          {formatRewardDescription(reward, { includeEarnPrefix: false })}
          {(!!reward.modifiers?.length ||
            Boolean(reward.tooltipDescription)) && (
            <>
              {" "}
              <ProgramRewardModifiersTooltip reward={reward} />
            </>
          )}
        </>
      ),
    })),
    ...(discount
      ? [
          {
            id: "discount",
            icon: DiscountCode,
            text: formatDiscountDescription(discount),
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={false}
      animate={{ height: showRewards ? "auto" : 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="border-t border-neutral-200 px-4 py-2">
        <div className="flex flex-col gap-2 rounded-[10px] border border-neutral-200 bg-white p-3">
          {items.map((item) => {
            const ItemIcon = item.icon;

            return (
              <div key={item.id} className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                  <ItemIcon className="size-4 text-neutral-800" />
                </div>
                <div className="min-w-0 text-sm font-semibold leading-5 tracking-tight text-neutral-700">
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
