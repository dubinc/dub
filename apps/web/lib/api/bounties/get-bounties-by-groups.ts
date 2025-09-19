import { prisma } from "@dub/prisma";
import { Bounty } from "@prisma/client";

export async function getBountiesByGroups({
  programId,
  groupIds,
}: {
  programId: string;
  groupIds: string[];
}) {
  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
      AND: [
        {
          OR: [
            { groups: { none: {} } },
            { groups: { some: { groupId: { in: groupIds } } } },
          ],
        },
      ],
    },
    include: {
      groups: true,
    },
  });

  const bountiesByGroups: Record<string, Bounty[]> = {};

  // Note: global bounties are not included here
  for (const groupId of groupIds) {
    bountiesByGroups[groupId] = bounties.filter((bounty) =>
      bounty.groups.some((g) => g.groupId === groupId),
    );
  }

  return bountiesByGroups;
}
