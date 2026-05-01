import { getGroupBountySummaries } from "@/lib/bounty/api/get-group-bounty-summaries";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getGroupOrThrow = async ({
  programId,
  groupId,
  includeExpandedFields = false,
  includeBounties = false,
}: {
  programId: string;
  groupId: string;
  includeExpandedFields?: boolean;
  includeBounties?: boolean;
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
      workflow: includeExpandedFields,
    },
  });

  if (!group) {
    throw new DubApiError({
      code: "not_found",
      message: `Group "${groupId}" not found.`,
    });
  }

  if (group.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: `Group "${groupId}" not found in your program.`,
    });
  }

  return {
    ...group,
    ...(includeBounties && {
      bounties: await getGroupBountySummaries({
        programId,
        groupId: group.id,
      }),
    }),
    moveRules: group.workflow?.triggerConditions,
  };
};
