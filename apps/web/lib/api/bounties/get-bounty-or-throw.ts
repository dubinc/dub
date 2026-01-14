import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { DubApiError } from "../errors";

interface GetBountyOrThrowParams<T extends Prisma.BountyInclude = {}> {
  programId: string;
  bountyId: string;
  include?: T;
}

export async function getBountyOrThrow<T extends Prisma.BountyInclude = {}>({
  programId,
  bountyId,
  include,
}: GetBountyOrThrowParams<T>): Promise<
  Prisma.BountyGetPayload<{ include: T }>
> {
  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
    },
    include,
  });

  if (!bounty) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty ${bountyId} not found.`,
    });
  }

  if (bounty.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty ${bountyId} not found.`,
    });
  }

  return bounty as Prisma.BountyGetPayload<{ include: T }>;
}
