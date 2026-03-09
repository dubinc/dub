import { prisma } from "@dub/prisma";
import { BountyType } from "@dub/prisma/client";

export type GroupBountySummary = {
  id: string;
  name: string;
  type: BountyType;
};

type BountyEligibilityCandidate = {
  id: string;
  name: string | null;
  type: BountyType;
  startsAt: Date;
  endsAt: Date | null;
  archivedAt: Date | null;
  groups: { groupId: string }[];
};

export function filterActiveGroupBounties(
  bounties: BountyEligibilityCandidate[],
  {
    groupId,
    now = new Date(),
  }: {
    groupId: string;
    now?: Date;
  },
) {
  return bounties.filter((bounty) => {
    if (bounty.archivedAt) {
      return false;
    }

    if (bounty.startsAt > now) {
      return false;
    }

    if (bounty.endsAt && bounty.endsAt <= now) {
      return false;
    }

    return (
      bounty.groups.length === 0 ||
      bounty.groups.some((group) => group.groupId === groupId)
    );
  });
}

export async function getGroupBountySummaries({
  programId,
  groupId,
  now = new Date(),
}: {
  programId: string;
  groupId: string;
  now?: Date;
}) {
  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      startsAt: true,
      endsAt: true,
      archivedAt: true,
      groups: {
        select: {
          groupId: true,
        },
      },
    },
    orderBy: {
      startsAt: "asc",
    },
  });

  return filterActiveGroupBounties(bounties, { groupId, now }).map((bounty) => ({
    id: bounty.id,
    name: bounty.name || "Untitled bounty",
    type: bounty.type,
  }));
}
