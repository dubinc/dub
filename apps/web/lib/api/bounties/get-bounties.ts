import {
  BountySchemaExtended,
  getBountiesQuerySchema,
} from "@/lib/zod/schemas/bounties";
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
  const { page, pageSize, sortBy, sortOrder, programId } = filters;

  const bounties: any[] = await prisma.$queryRaw`
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
      
      -- Partners count
      COALESCE(
        (
          SELECT COUNT(DISTINCT pe.partnerId)
          FROM ProgramEnrollment pe
          WHERE pe.status IN ('approved', 'invited')
          AND (
            -- If bounty has specific groups, count only partners in those groups
            EXISTS (
              SELECT 1
              FROM BountyGroup bg 
              WHERE bg.bountyId = b.id AND bg.groupId = pe.groupId
            )
            OR
            -- If bounty has no groups, count all approved/invited partners
            NOT EXISTS (
              SELECT 1 
              FROM BountyGroup bg 
              WHERE bg.bountyId = b.id
            )
          )
        ),
        0
      ) as partnersCount,

      --  Bounty groups
      COALESCE(
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', groupId))
          FROM BountyGroup
          WHERE bountyId = b.id
        ),
        JSON_ARRAY()
      ) as groups,

      --  Bounty submissions count
      COALESCE(
        (
			    SELECT COUNT(bs.id)
			    FROM BountySubmission bs
			    WHERE bs.bountyId = b.id
		    ),
		    0
	    ) AS submissions
    FROM Bounty b
    LEFT JOIN BountyGroup bg ON bg.bountyId = b.id
    LEFT JOIN ProgramEnrollment pe ON pe.groupId = bg.groupId AND pe.status IN ('approved', 'invited')
    LEFT JOIN Workflow wf ON wf.id = b.workflowId
    WHERE b.programId = ${programId}
    GROUP BY b.id, b.name, b.description, b.type, b.startsAt, b.endsAt, b.rewardAmount, b.submissionRequirements
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

  const results = bounties.map((bounty) => {
    const performanceCondition =
      bounty.triggerConditions?.length > 0 ? bounty.triggerConditions[0] : null;

    return {
      id: bounty.id,
      name: bounty.name,
      description: bounty.description,
      type: bounty.type,
      startsAt: bounty.startsAt,
      endsAt: bounty.endsAt,
      rewardAmount: bounty.rewardAmount,
      submissionRequirements: bounty.submissionRequirements,
      performanceCondition,
      partnersCount: Number(bounty.partnersCount),
      submissionsCount: Number(bounty.submissions),
      groups: bounty.groups.filter((group) => group !== null),
    };
  });

  return z.array(BountySchemaExtended).parse(results);
}
