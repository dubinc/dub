import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getBountiesForPartner } from "@/lib/bounty/api/get-bounties-for-partner";
import { referralsEmbedToken } from "@/lib/embed/referrals/token-class";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerGroupAdditionalLink } from "@/lib/types";
import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import { prisma } from "@dub/prisma";
import { Reward } from "@dub/prisma/client";
import { notFound } from "next/navigation";
import * as z from "zod/v4";

export const getReferralsEmbedData = async (token: string) => {
  const { programId, partnerId } = (await referralsEmbedToken.get(token)) ?? {};

  if (!programId || !partnerId) {
    notFound();
  }

  const now = new Date();
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId,
    programId,
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
          platforms: {
            select: {
              type: true,
              identifier: true,
              verifiedAt: true,
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          defaultGroupId: true,
          minPayoutAmount: true,
          termsUrl: true,
          embedData: true,
          resources: true,
          _count: {
            select: {
              bounties: {
                where: {
                  startsAt: {
                    lte: now,
                  },
                  OR: [{ endsAt: null }, { endsAt: { gte: now } }],
                },
              },
            },
          },
        },
      },
      links: true,
      partnerGroup: true,
      discount: true,
      clickReward: true,
      leadReward: true,
      saleReward: true,
    },
  });

  if (!programEnrollment || !programEnrollment.partnerGroup) {
    notFound();
  }

  const {
    program,
    partner,
    links,
    discount,
    clickReward,
    leadReward,
    saleReward,
    partnerGroup: group,
  } = programEnrollment;

  const { totalClicks, totalLeads, totalSales, totalSaleAmount } =
    aggregatePartnerLinksStats(links);

  const [commissions, bounties] = await Promise.all([
    prisma.commission.groupBy({
      by: ["status"],
      _sum: {
        earnings: true,
      },
      _count: {
        id: true,
      },
      where: {
        earnings: {
          gt: 0,
        },
        programId,
        partnerId,
      },
    }),

    program._count.bounties > 0
      ? getBountiesForPartner(programEnrollment)
      : Promise.resolve([]),
  ]);

  return {
    program,
    partner: {
      id: partner.id,
      name: partner.name,
      email: partner.email,
    },
    partnerPlatforms: partner.platforms,
    links: z.array(ReferralsEmbedLinkSchema).parse(links),
    rewards: [clickReward, leadReward, saleReward]
      .filter((r): r is Reward => r !== null)
      .map((r) => serializeReward(r)),
    discount,
    earnings: {
      upcoming: commissions.reduce((acc, c) => {
        if (c.status === "pending" || c.status === "processed") {
          return acc + (c._sum.earnings ?? 0);
        }
        return acc;
      }, 0),
      paid: commissions.find((c) => c.status === "paid")?._sum.earnings ?? 0,
      totalCount: commissions.reduce((acc, c) => acc + c._count.id, 0),
    },
    stats: {
      clicks: totalClicks,
      leads: totalLeads,
      sales: totalSales,
      saleAmount: totalSaleAmount,
    },
    programEnrollment: {
      createdAt: programEnrollment.createdAt,
    },
    group: {
      id: group.id,
      logo: group.logo,
      wordmark: group.wordmark,
      brandColor: group.brandColor,
      additionalLinks: group.additionalLinks as PartnerGroupAdditionalLink[],
      maxPartnerLinks: group.maxPartnerLinks,
      linkStructure: group.linkStructure,
      holdingPeriodDays: group.holdingPeriodDays,
    },
    bounties,
  };
};
