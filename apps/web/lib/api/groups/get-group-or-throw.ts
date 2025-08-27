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
    ...(includeExpandedFields
      ? {
          include: {
            clickReward: true,
            leadReward: true,
            saleReward: true,
            discount: true,
            utmTemplate: true,
          },
        }
      : {}),
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

  console.log(group)

  return group;
};
