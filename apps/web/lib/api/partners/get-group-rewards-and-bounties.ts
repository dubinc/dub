import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { BountyType, EventType, Reward } from "@dub/prisma/client";
import { getGroupOrThrow } from "../groups/get-group-or-throw";
import { serializeReward } from "./serialize-reward";

const REWARD_ICONS: Record<EventType, string> = {
  click: "https://assets.dub.co/email-assets/icons/cursor-rays.png",
  lead: "https://assets.dub.co/email-assets/icons/user-plus.png",
  sale: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
};

const BOUNTY_ICONS: Record<BountyType, string> = {
  submission: "https://assets.dub.co/email-assets/icons/heart.png",
  performance: "https://assets.dub.co/email-assets/icons/trophy.png",
};

export async function getGroupRewardsAndBounties({
  programId,
  groupId,
}: {
  programId: string;
  groupId: string;
}) {
  const group = await getGroupOrThrow({
    programId,
    groupId,
    includeExpandedFields: true,
    includeBounties: true,
  });

  return {
    rewards: [
      ...[group.clickReward, group.leadReward, group.saleReward]
        .filter((r): r is Reward => r !== null)
        .map((reward) => ({
          label: formatRewardDescription(serializeReward(reward)),
          icon: REWARD_ICONS[reward.event],
        })),
      ...(group.discount
        ? [
            {
              label: formatDiscountDescription(group.discount),
              icon: "https://assets.dub.co/email-assets/icons/gift.png",
            },
          ]
        : []),
    ],
    bounties: (group.bounties ?? []).map((bounty) => ({
      icon: BOUNTY_ICONS[bounty.type],
      label: bounty.name,
    })),
    group,
  };
}
