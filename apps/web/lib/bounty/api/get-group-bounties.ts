import { prisma } from "@/lib/prisma";
import { buildActiveBountyPeriodWhere } from "./bounty-eligibility";

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
      groups: {
        some: {
          groupId,
        },
      },
      ...buildActiveBountyPeriodWhere(),
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: {
      startsAt: "asc",
    },
  });

  return bounties;
}
