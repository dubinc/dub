import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getBountyWithDetails = async ({
  bountyId,
  programId,
}: {
  bountyId: string;
  programId: string;
}) => {
  const bounties = (await prisma.$queryRaw`
    SELECT
      b.id,
      b.name,
      b.description,
      b.type,
      b.startsAt,
      b.endsAt,
      b.submissionsOpenAt,
      b.rewardAmount,
      b.rewardDescription,
      b.submissionRequirements,
      b.performanceScope,
      wf.triggerConditions,

      -- Partners count
      COALESCE(
        (
          SELECT COUNT(pe.partnerId)
          FROM ProgramEnrollment pe
          WHERE pe.programId = ${programId} AND pe.status IN ('approved', 'invited')
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

      --  Bounty submissions total count
      COALESCE(
        (
          SELECT COUNT(*)
          FROM BountySubmission
          WHERE bountyId = b.id
        ),
        0
      ) AS submissions

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
  const performanceScope = bounty.performanceScope;

  return {
    id: bounty.id,
    name: bounty.name,
    description: bounty.description,
    type: bounty.type,
    startsAt: bounty.startsAt,
    endsAt: bounty.endsAt,
    submissionsOpenAt: bounty.submissionsOpenAt,
    rewardAmount: bounty.rewardAmount,
    rewardDescription: bounty.rewardDescription,
    submissionRequirements: bounty.submissionRequirements,
    performanceScope,
    performanceCondition,
    groups: bounty.groups.filter((group) => group !== null) ?? [],
    partnersCount: Number(bounty.partners),
    submissionsCount: Number(bounty.submissions),
  };
};
