import { pluck } from "@dub/utils";
import { prisma } from "../prisma";

// Delete rewards that are orphaned (not associated with a program or partner group or commissions)
export async function deleteOrphanedRewards(cutoff: Date) {
  const rewards = await prisma.reward.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: cutoff,
      },
      OR: [
        {
          event: "click",
          clickEnrollments: { none: {} },
          clickPartnerGroup: { is: null },
          clickLinkRewards: { none: {} },
          commissions: { none: {} },
        },
        {
          event: "lead",
          leadEnrollments: { none: {} },
          leadPartnerGroup: { is: null },
          leadLinkRewards: { none: {} },
          commissions: { none: {} },
        },
        {
          event: "sale",
          saleEnrollments: { none: {} },
          salePartnerGroup: { is: null },
          saleLinkRewards: { none: {} },
          commissions: { none: {} },
        },
        {
          event: "referral",
          referralEnrollments: { none: {} },
          referralPartnerGroup: { is: null },
          commissions: { none: {} },
        },
        {
          event: "custom",
          customEnrollments: { none: {} },
          customPartnerGroup: { is: null },
          commissions: { none: {} },
        },
      ],
    },
    select: {
      id: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  if (rewards.length === 0) {
    return 0;
  }

  // If the reward is not referenced by any enrollments, groups, link rewards, or commissions, it can be hard deleted
  const { count } = await prisma.reward.deleteMany({
    where: {
      id: {
        in: pluck(rewards, "id"),
      },
    },
  });

  return count;
}
