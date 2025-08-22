import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { DubApiError } from "../errors";

export const getBountyOrThrow = async ({
  bountyId,
  programId,
  includeExpandedFields = false,
}: {
  bountyId: string;
  programId: string;
  includeExpandedFields?: boolean;
}) => {
  const bounties = (await prisma.$queryRaw`
    SELECT
      b.id,
      b.name,
      b.description,
      b.type,
      b.startsAt,
      b.endsAt,
      b.rewardAmount,
      b.submissionRequirements,
      wf.triggerConditions,
      ${
        includeExpandedFields
          ? Prisma.sql`
            COUNT(DISTINCT pe.partnerId) as partnersCount,
            COALESCE(
              (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT('id', bgSub.groupId)
                )
                FROM BountyGroup bgSub
                WHERE bgSub.bountyId = b.id
              ),
              JSON_ARRAY()
            ) as groups
          `
          : Prisma.sql`
            0 as partnersCount,
            JSON_ARRAY() as groups
          `
      }
    FROM Bounty b
    ${
      includeExpandedFields
        ? Prisma.sql`
          LEFT JOIN BountyGroup bg ON bg.bountyId = b.id
          LEFT JOIN ProgramEnrollment pe ON pe.groupId = bg.groupId AND pe.status IN ('approved', 'invited')
        `
        : Prisma.sql``
    }
    LEFT JOIN Workflow wf ON wf.id = b.workflowId
    WHERE b.programId = ${programId}
    AND b.id = ${bountyId}
    GROUP BY b.id
    LIMIT 1
  `) satisfies Array<any>;

  if (!bounties.length) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty ${bountyId} not found.`,
    });
  }

  const bounty = bounties[0];

  return {
    ...bounty,
    performanceCondition:
      bounty.triggerConditions?.length > 0 ? bounty.triggerConditions[0] : null,
    partnersCount: Number(bounty.partnersCount),
    groups: bounty.groups.filter((group) => group !== null),
  };
};
