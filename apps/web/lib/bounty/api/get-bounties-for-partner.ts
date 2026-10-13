import {
  aggregatePartnerLinksStats,
  PartnerLink,
} from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { pluck } from "@dub/utils";
import { Program, ProgramEnrollment, ProgramPartnerTag } from "@prisma/client";
import * as z from "zod/v4";
import {
  bountyEligibilityIncludes,
  buildBountyActivePeriodWhere,
  buildBountyEligibilityWhere,
  canPartnerSeeBounty,
  getEffectiveBountyPeriod,
} from "./bounty-availability";

type GetBountiesForPartnerParams = Pick<
  ProgramEnrollment,
  "groupId" | "partnerId" | "totalCommissions" | "createdAt" | "status"
> & {
  links: PartnerLink[];
  program: Pick<Program, "id" | "defaultGroupId">;
  programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
};

export async function getBountiesForPartner(
  programEnrollment: GetBountiesForPartnerParams,
) {
  const bounties = await getBountiesForPartnerEnrollments([programEnrollment]);

  return z.array(PartnerBountySchema).parse(bounties);
}

// the bounties a partner can see across their program enrollments, in one query.
// Each bounty keeps its programId, so callers can match it to its program
export async function getBountiesForPartnerEnrollments(
  programEnrollments: GetBountiesForPartnerParams[],
) {
  if (programEnrollments.length === 0) {
    return [];
  }

  // all enrollments belong to the same partner
  const { partnerId } = programEnrollments[0];

  const bounties = await prisma.bounty.findMany({
    where: {
      archivedAt: null,
      OR: programEnrollments.map(
        ({ program, groupId, programPartnerTags }) => ({
          programId: program.id,
          OR: [
            {
              submissions: {
                some: {
                  partnerId,
                },
              },
            },
            {
              AND: [
                buildBountyEligibilityWhere({
                  groupId: groupId || program.defaultGroupId,
                  partnerTagIds: pluck(programPartnerTags, "partnerTagId"),
                }),
                buildBountyActivePeriodWhere(),
              ],
            },
          ],
        }),
      ),
    },
    include: {
      ...bountyEligibilityIncludes,
      workflow: {
        select: {
          triggerConditions: true,
        },
      },
      submissions: {
        where: {
          partnerId,
        },
        include: {
          commissions: {
            select: {
              id: true,
              earnings: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  const enrollmentsByProgramId = new Map(
    programEnrollments.map(({ program, links, ...programEnrollment }) => [
      program.id,
      {
        program,
        programEnrollment,
        partnerLinkStats: aggregatePartnerLinksStats(links),
      },
    ]),
  );

  return bounties.flatMap((bounty) => {
    const enrollment = enrollmentsByProgramId.get(bounty.programId);

    if (
      !enrollment ||
      !canPartnerSeeBounty({
        program: enrollment.program,
        bounty,
        programEnrollment: enrollment.programEnrollment,
      })
    ) {
      return [];
    }

    const { programEnrollment, partnerLinkStats } = enrollment;

    const performanceCondition =
      bounty.workflow?.triggerConditions?.[0] || null;

    const { startsAt, endsAt } = getEffectiveBountyPeriod({
      programEnrollment,
      bounty,
    });

    return [
      {
        ...bounty,
        startsAt,
        endsAt,
        performanceCondition,
        partner: {
          ...partnerLinkStats,
          totalCommissions: programEnrollment.totalCommissions,
        },
      },
    ];
  });
}
