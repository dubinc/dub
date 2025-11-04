import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { prisma } from "@dub/prisma";
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

export async function getPartnerInviteRewardsAndBounties({
  programId,
  groupId,
}: {
  programId: string;
  groupId: string;
}) {
  const now = new Date();

  const [group, bounties] = await Promise.all([
    getGroupOrThrow({
      programId,
      groupId,
      includeExpandedFields: true,
    }),
    prisma.bounty.findMany({
      where: {
        programId,
        startsAt: {
          lte: now,
        },
        // Check if the bounty is active
        OR: [
          {
            endsAt: null,
          },
          {
            endsAt: {
              gt: now,
            },
          },
        ],
        // If bounty has no groups, it's available to all partners
        // If bounty has groups, only partners in those groups can see it
        AND: [
          {
            OR: [
              {
                groups: {
                  none: {},
                },
              },
              {
                groups: {
                  some: {
                    groupId,
                  },
                },
              },
            ],
          },
        ],
      },
    }),
  ]);

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
    bounties: bounties.map((bounty) => ({
      icon: BOUNTY_ICONS[bounty.type],
      label: bounty.name,
    })),
  };
}
