import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getGroupOrThrow = async ({
  programId,
  groupId,
  includeExpandedFields = false,
}: {
  programId: string;
  groupId: string;
  includeExpandedFields?: boolean;
}) => {
  const group = await prisma.partnerGroup.findUnique({
    where: {
      ...(groupId.startsWith("grp_")
        ? {
            id: groupId,
          }
        : {
            programId_slug: {
              programId,
              slug: groupId,
            },
          }),
    },
    include: {
      clickReward: includeExpandedFields,
      leadReward: includeExpandedFields,
      saleReward: includeExpandedFields,
      discount: includeExpandedFields,
      utmTemplate: includeExpandedFields,
      partnerGroupDefaultLinks: includeExpandedFields,
      program: includeExpandedFields,
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

  return group;
};
