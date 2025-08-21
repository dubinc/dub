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

  return {
    ...bounties[0],
    partnersCount: Number(bounties[0].partnersCount),
    groups: bounties[0].groups.filter((group) => group !== null),
  };
};
