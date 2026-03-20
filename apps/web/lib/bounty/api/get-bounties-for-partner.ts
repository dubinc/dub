import {
  aggregatePartnerLinksStats,
  PartnerLink,
} from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { Program, ProgramEnrollment } from "@dub/prisma/client";
import * as z from "zod/v4";

type GetBountiesForPartnerParams = Pick<
  ProgramEnrollment,
  "groupId" | "partnerId" | "totalCommissions"
> & {
  links: PartnerLink[];
  program: Pick<Program, "id" | "defaultGroupId">;
};

export async function getBountiesForPartner(
  params: GetBountiesForPartnerParams,
) {
  const { groupId, partnerId, totalCommissions, program, links } = params;

  const now = new Date();

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      startsAt: {
        lte: now,
      },
      // If bounty has no groups, it's available to all partners
      // If bounty has groups, only partners in those groups can see it
      AND: [
        {
          OR: [
            {
              groups: {
                none: {},
              },
            },
            {
              groups: {
                some: {
                  groupId: groupId || program.defaultGroupId,
                },
              },
            },
          ],
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
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
    bounties.map((bounty) => ({
      ...bounty,
      performanceCondition: bounty.workflow?.triggerConditions?.[0] || null,
      partner: {
        ...partnerLinkStats,
        totalCommissions,
      },
    })),
  );
}
