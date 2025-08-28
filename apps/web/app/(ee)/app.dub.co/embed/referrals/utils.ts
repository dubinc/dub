import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { referralsEmbedToken } from "@/lib/embed/referrals/token-class";
import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
import { notFound } from "next/navigation";
import { z } from "zod";

export const getReferralsEmbedData = async (token: string) => {
  const { programId, partnerId } = (await referralsEmbedToken.get(token)) ?? {};

  if (!programId || !partnerId) {
    notFound();
  }

  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId,
    programId,
    includePartner: true,
    includeClickReward: true,
    includeLeadReward: true,
    includeSaleReward: true,
    includeDiscount: true,
    includeGroup: true,
  });

  if (!programEnrollment || !programEnrollment.partnerGroup) {
    notFound();
  }

  const commissions = await prisma.commission.groupBy({
    by: ["status"],
    _sum: {
      earnings: true,
    },
    where: {
      earnings: {
        gt: 0,
      },
      programId,
      partnerId,
    },
  });

  const {
    program,
    partner,
    links,
    discount,
    clickReward,
    leadReward,
    saleReward,
    group,
  } = programEnrollment;

  return {
    program,
    partner: {
      id: partner.id,
      name: partner.name,
      email: partner.email,
    },
    links: z.array(ReferralsEmbedLinkSchema).parse(links),
    rewards: sortRewardsByEventOrder(
      [clickReward, leadReward, saleReward].filter(
        (r): r is Reward => r !== null,
      ),
    ),
    discount,
    earnings: {
      upcoming: commissions.reduce((acc, c) => {
        if (c.status === "pending" || c.status === "processed") {
          return acc + (c._sum.earnings ?? 0);
        }
        return acc;
      }, 0),
      paid: commissions.find((c) => c.status === "paid")?._sum.earnings ?? 0,
    },
    stats: {
      clicks: links.reduce((acc, link) => acc + link.clicks, 0),
      leads: links.reduce((acc, link) => acc + link.leads, 0),
      sales: links.reduce((acc, link) => acc + link.sales, 0),
      saleAmount: links.reduce((acc, link) => acc + link.saleAmount, 0),
    },
    group: {
      id: group.id,
      defaultLinks: group.defaultLinks,
      additionalLinks: group.additionalLinks,
      maxPartnerLinks: group.maxPartnerLinks,
      linkStructure: group.linkStructure,
    },
  };
};
