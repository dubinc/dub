import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import {
  Link,
  Program,
  ProgramEnrollment,
  ProgramPartnerTag,
} from "@prisma/client";
import * as z from "zod/v4";
import { getEffectiveBountyPeriod } from "../bounty-period";
import {
  buildActiveBountyPeriodWhere,
  buildBountyEligibilityWhere,
} from "./bounty-eligibility";

type GetBountiesForPartnerParams = Pick<
  ProgramEnrollment,
  "groupId" | "partnerId" | "totalCommissions" | "groupJoinedAt" | "createdAt"
> & {
  programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  links: Pick<
    Link,
    "clicks" | "leads" | "conversions" | "sales" | "saleAmount"
  >[];
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
  programPartnerTags,
}: GetBountiesForPartnerParams) {
  const partnerTagIds = programPartnerTags.map(
    ({ partnerTagId }) => partnerTagId,
  );

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      OR: [
        {
          ...buildActiveBountyPeriodWhere(),
          ...buildBountyEligibilityWhere({
            groupId: groupId || program.defaultGroupId,
            partnerTagIds,
          }),
        },
        // Bounties the partner has a submission on stay visible even if the
        // partner is no longer eligible or the bounty was archived
        {
          submissions: {
            some: {
              partnerId,
            },
          },
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
