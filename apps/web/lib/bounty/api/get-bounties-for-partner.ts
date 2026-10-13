import {
  aggregatePartnerLinksStats,
  PartnerLink,
  PartnerLinksStats,
} from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { pluck } from "@dub/utils";
import {
  Program,
  ProgramEnrollment,
  ProgramPartnerTag,
  Workflow,
} from "@prisma/client";
import * as z from "zod/v4";
import {
  bountyEligibilityIncludes,
  buildBountyActivePeriodWhere,
  buildBountyEligibilityWhere,
  canPartnerSeeBounty,
  getEffectiveBountyPeriod,
} from "./bounty-availability";

type PartnerBountyEnrollment = Pick<
  ProgramEnrollment,
  "groupId" | "totalCommissions" | "createdAt" | "status"
> & {
  program: Pick<Program, "id" | "defaultGroupId">;
  programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
};

export async function getBountiesForPartner({
  links,
  partnerId,
  ...programEnrollment
}: PartnerBountyEnrollment &
  Pick<ProgramEnrollment, "partnerId"> & {
    links: PartnerLink[];
  }) {
  const bounties = await getBountiesForPartnerEnrollments({
    partnerId,
    programEnrollments: [
      {
        ...programEnrollment,
        partnerLinksStats: aggregatePartnerLinksStats(links),
      },
    ],
  });

  return z.array(PartnerBountySchema).parse(bounties);
}

// the bounties a partner can see across their program enrollments, in one query.
// Each bounty keeps its programId, so callers can match it to its program
export async function getBountiesForPartnerEnrollments({
  partnerId,
  programEnrollments,
}: {
  partnerId: string;
  programEnrollments: (PartnerBountyEnrollment & {
    partnerLinksStats: PartnerLinksStats;
  })[];
}) {
  if (programEnrollments.length === 0) {
    return [];
  }

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
    programEnrollments.map((programEnrollment) => [
      programEnrollment.program.id,
      programEnrollment,
    ]),
  );

  return bounties.flatMap((bounty) => {
    const programEnrollment = enrollmentsByProgramId.get(bounty.programId);

    if (
      !programEnrollment ||
      !canPartnerSeeBounty({
        program: programEnrollment.program,
        bounty,
        programEnrollment,
      })
    ) {
      return [];
    }

    return [
      toPartnerBounty({
        bounty,
        programEnrollment,
        partnerLinksStats: programEnrollment.partnerLinksStats,
      }),
    ];
  });
}

// adds the partner's bounty period, performance condition and stats to a bounty
export function toPartnerBounty<
  T extends Parameters<typeof getEffectiveBountyPeriod>[0]["bounty"] & {
    workflow: Pick<Workflow, "triggerConditions"> | null;
  },
>({
  bounty,
  programEnrollment,
  partnerLinksStats,
}: {
  bounty: T;
  programEnrollment: Pick<ProgramEnrollment, "createdAt" | "totalCommissions">;
  partnerLinksStats: PartnerLinksStats;
}) {
  const { startsAt, endsAt } = getEffectiveBountyPeriod({
    programEnrollment,
    bounty,
  });

  return {
    ...bounty,
    startsAt,
    endsAt,
    performanceCondition: bounty.workflow?.triggerConditions?.[0] || null,
    partner: {
      ...partnerLinksStats,
      totalCommissions: programEnrollment.totalCommissions,
    },
  };
}
