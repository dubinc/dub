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
            -- Partners count
            COALESCE(
              (
                SELECT COUNT(pe.partnerId)
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
            ) AS partners,

            --  Bounty groups
            COALESCE(
              (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT('id', groupId)
                )
                FROM BountyGroup
                WHERE bountyId = b.id
              ),
              JSON_ARRAY()
            ) AS groups,

            --  Bounty submissions count by status
            COALESCE(
              (
                SELECT JSON_OBJECT(
                  'pending', COALESCE(SUM(status = 'pending'), 0),
                  'approved', COALESCE(SUM(status = 'approved'), 0),
                  'rejected', COALESCE(SUM(status = 'rejected'), 0)
                )
                FROM BountySubmission
                WHERE bountyId = b.id
              ),
              JSON_OBJECT('pending', 0, 'approved', 0, 'rejected', 0)
            ) AS submissions
          `
          : Prisma.sql`
            0 AS partners,
            JSON_ARRAY() AS groups,
            JSON_OBJECT('pending', 0, 'approved', 0, 'rejected', 0) AS submissions
          `
      }
    FROM Bounty b
    LEFT JOIN Workflow wf ON wf.id = b.workflowId
    WHERE b.id = ${bountyId} AND b.programId = ${programId}
    LIMIT 1
  `) satisfies Array<any>;

  if (!bounties.length) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty ${bountyId} not found.`,
    });
  }

  const bounty = bounties[0];
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
    groups: bounty.groups.filter((group) => group !== null),
    partners: Number(bounty.partners),
    submissions: bounty.submissions,
  };
};
