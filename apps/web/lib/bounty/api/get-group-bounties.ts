import { prisma } from "@/lib/prisma";
import {
  buildActiveBountyPeriodWhere,
  buildBountyEligibilityWhere,
} from "./bounty-eligibility";

// Get active bounties for a given group
export async function getGroupBounties({
  programId,
  groupId,
}: {
  programId: string;
  groupId: string;
}) {
  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
      ...buildActiveBountyPeriodWhere(),
      ...buildBountyEligibilityWhere({
        groupId,
        partnerTagIds: [], // No partner context
      }),
    },
    select: {
      id: true,
      name: true,
      type: true,
      startsAt: true,
      endsAt: true,
      endsAfterDays: true,
      startMode: true,
      archivedAt: true,
      groups: {
        select: {
          groupId: true,
        },
      },
      partnerTags: {
        select: {
          partnerTagId: true,
        },
      },
    },
    orderBy: {
      startsAt: "asc",
    },
  });

  return bounties;
}
