import { prisma } from "@dub/prisma";
import { Bounty } from "@prisma/client";

export async function getBountiesByGroups({
  programId,
  groupIds,
}: {
  programId: string;
  groupIds: string[];
}) {
  const now = new Date();

  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
      startsAt: {
        lte: now,
      },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
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

  for (const groupId of groupIds) {
    bountiesByGroups[groupId] = bounties.filter((bounty) =>
      bounty.groups.some((g) => g.groupId === groupId),
    );
  }

  return bountiesByGroups;
}
