import {
  aggregatePartnerLinksStats,
  PartnerLink,
} from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { Program, ProgramEnrollment } from "@prisma/client";
import * as z from "zod/v4";
import {
  buildBountyActivePeriodWhere,
  buildBountyEligibilityWhere,
  getEffectiveBountyPeriod,
} from "./bounty-availability";

type GetBountiesForPartnerParams = Pick<
  ProgramEnrollment,
  "groupId" | "partnerId" | "totalCommissions" | "groupJoinedAt" | "createdAt"
> & {
  links: PartnerLink[];
  program: Pick<Program, "id" | "defaultGroupId">;
};

export async function getBountiesForPartner({
  partnerId,
  groupId,
  totalCommissions,
  createdAt,
  groupJoinedAt,
  program,
  links,
}: GetBountiesForPartnerParams) {
  const now = new Date();
  const partnerGroupId = groupId || program.defaultGroupId;

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      OR: [
        {
          archivedAt: null,
          ...buildBountyEligibilityWhere(partnerGroupId),
          OR: [
            ...buildBountyActivePeriodWhere(),
            // Bounties the partner has a submission on stay visible
            {
              submissions: {
                some: {
                  partnerId,
                },
              },
            },
          ],
        },
      ],
    },
    include: {
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

  return z.array(PartnerBountySchema).parse(
    bounties.map((bounty) => {
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
