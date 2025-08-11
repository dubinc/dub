import { GroupSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getGroupOrThrow = async ({
  programId,
  groupId,
}: {
  programId: string;
  groupId: string;
}) => {
  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    include: {
      clickReward: true,
      leadReward: true,
      saleReward: true,
      discount: true,
    },
  });

  if (!group) {
    throw new DubApiError({
      code: "not_found",
      message: `Group with ID ${groupId} not found.`,
    });
  }

  if (group.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: `Group with ID ${groupId} not found in your program.`,
    });
  }

  return GroupSchema.parse(group);
};
