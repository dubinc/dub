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

export async function getBountiesForPartner({
  program,
  links,
  programPartnerTags,
  ...programEnrollment
}: GetBountiesForPartnerParams) {
  const { groupId, partnerId, totalCommissions, createdAt } = programEnrollment;

  const partnerGroupId = groupId || program.defaultGroupId;
  const partnerTagIds = pluck(programPartnerTags, "partnerTagId");

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
            buildBountyEligibilityWhere({
              groupId: partnerGroupId,
              partnerTagIds,
            }),
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
      programEnrollment: {
        ...programEnrollment,
        programPartnerTags,
      },
    }),
  );

  return z.array(PartnerBountySchema).parse(
    visibleBounties.map((bounty) => {
      const performanceCondition =
        bounty.workflow?.triggerConditions?.[0] || null;

      const { startsAt, endsAt } = getEffectiveBountyPeriod({
        programEnrollment: {
          createdAt,
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
