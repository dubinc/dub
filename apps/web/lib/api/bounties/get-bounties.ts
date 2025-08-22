import { getBountiesQuerySchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type BountyFilters = z.infer<typeof getBountiesQuerySchema> & {
  programId: string;
};

const sortColumnsMap = {
  createdAt: "b.createdAt",
};

export async function getBounties(filters: BountyFilters) {
  const {
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includeExpandedFields,
  } = filters;

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
    GROUP BY b.id, b.name, b.description, b.type, b.startsAt, b.endsAt, b.rewardAmount, b.submissionRequirements
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `) satisfies Array<any>;

  return bounties.map((bounty) => ({
    ...bounty,
    partnersCount: Number(bounty.partnersCount),
    groups: bounty.groups.filter((group) => group !== null),
    performanceCondition:
      bounty.triggerConditions?.length > 0 ? bounty.triggerConditions[0] : null,
  }));
}
