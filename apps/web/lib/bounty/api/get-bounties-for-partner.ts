import {
  aggregatePartnerLinksStats,
  PartnerLink,
} from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { Program, ProgramEnrollment, ProgramPartnerTag } from "@prisma/client";
import * as z from "zod/v4";
import { buildBountyEligibilityWhere } from "./bounty-eligibility";

type GetBountiesForPartnerParams = Pick<
  ProgramEnrollment,
  "groupId" | "partnerId" | "totalCommissions"
> & {
  programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  links: PartnerLink[];
  program: Pick<Program, "id" | "defaultGroupId">;
};

export async function getBountiesForPartner({
  groupId,
  programPartnerTags,
  partnerId,
  totalCommissions,
  program,
  links,
}: GetBountiesForPartnerParams) {
  const now = new Date();
  const partnerTagIds = programPartnerTags.map(
    ({ partnerTagId }) => partnerTagId,
  );

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      startsAt: {
        lte: now,
      },
      ...buildBountyEligibilityWhere({
        groupId: groupId || program.defaultGroupId,
        partnerTagIds,
      }),
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
