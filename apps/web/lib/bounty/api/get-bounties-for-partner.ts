import {
  aggregatePartnerLinksStats,
  PartnerLink,
} from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { Program, ProgramEnrollment } from "@prisma/client";
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
  | "groupId"
  | "partnerId"
  | "totalCommissions"
  | "groupJoinedAt"
  | "createdAt"
  | "status"
> & {
  links: PartnerLink[];
  program: Pick<Program, "id" | "defaultGroupId">;
};

export async function getBountiesForPartner({
  program,
  links,
  ...programEnrollment
}: GetBountiesForPartnerParams) {
  const { groupId, partnerId, totalCommissions, createdAt, groupJoinedAt } =
    programEnrollment;

  const partnerGroupId = groupId || program.defaultGroupId;

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      archivedAt: null,
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
            buildBountyEligibilityWhere(partnerGroupId),
            buildBountyActivePeriodWhere(),
          ],
        },
      ],
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
          commission: {
            select: {
              id: true,
              earnings: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const partnerLinkStats = aggregatePartnerLinksStats(links);

  const visibleBounties = bounties.filter((bounty) =>
    canPartnerSeeBounty({
      program,
      bounty,
      programEnrollment,
    }),
  );

  return z.array(PartnerBountySchema).parse(
    visibleBounties.map((bounty) => {
      const performanceCondition =
        bounty.workflow?.triggerConditions?.[0] || null;

      const { startsAt, endsAt } = getEffectiveBountyPeriod({
        programEnrollment: {
          createdAt,
          groupJoinedAt,
        },
        bounty,
      });

      return {
        ...bounty,
        startsAt,
        endsAt,
        performanceCondition,
        partner: {
          ...partnerLinkStats,
          totalCommissions,
        },
      };
    }),
  );
}
