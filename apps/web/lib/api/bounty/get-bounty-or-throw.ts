import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getBountyOrThrow = async ({
  bountyId,
  programId,
}: {
  bountyId: string;
  programId: string;
}) => {
  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
    },
  });

  if (!bounty) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty ${bountyId} not found.`,
    });
  }

  if (bounty.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: `Bounty ${bountyId} does not belong to the program.`,
    });
  }

  return bounty;
};
