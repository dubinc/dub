import { prisma } from "@dub/prisma";
import { Bounty } from "@dub/prisma/client";

type GetBountiesByGroupProps = {
  programId: string;
  groupIds: string[];
};

export async function getBountiesByGroup({
  programId,
  groupIds,
}: GetBountiesByGroupProps) {
  const now = new Date();
  const targetGroupIds = [...new Set(groupIds)];

  if (targetGroupIds.length === 0) {
    return {};
  }

  const bounties = await prisma.bounty.findMany({
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
      // Only fetch bounties that are relevant to the specified groups
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
                  groupId: {
                    in: targetGroupIds,
                  },
                },
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      groups: {
        select: {
          groupId: true,
        },
      },
    },
  });

  if (bounties.length === 0) {
    return {};
  }

  const groupIdToBounties = bounties.reduce(
    (acc, bounty) => {
      const targetIds =
        bounty.groups.length > 0
          ? bounty.groups.map((g) => g.groupId)
          : targetGroupIds;

      targetIds.forEach((groupId) => {
        (acc[groupId] ||= []).push({
          id: bounty.id,
          name: bounty.name,
        });
      });

      return acc;
    },
    {} as Record<string, Pick<Bounty, "id" | "name">[]>,
  );

  return groupIdToBounties;
}
