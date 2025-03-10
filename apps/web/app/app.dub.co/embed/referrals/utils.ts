import { referralsEmbedToken } from "@/lib/embed/referrals/token-class";
import { determinePartnerDiscount } from "@/lib/partners/determine-partner-discount";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { prisma } from "@dub/prisma";
import { notFound } from "next/navigation";

export const getReferralsEmbedData = async (token: string) => {
  const { programId, partnerId } = (await referralsEmbedToken.get(token)) ?? {};

  if (!programId || !partnerId) {
    notFound();
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      links: true,
      program: true,
    },
  });

  if (!programEnrollment) {
    notFound();
  }

  const [reward, discount, payouts] = await Promise.all([
    determinePartnerReward({
      programId,
      partnerId,
      event: "sale",
    }),

    determinePartnerDiscount({
      programId,
      partnerId,
    }),

    prisma.payout.groupBy({
      by: ["status"],
      _sum: {
        amount: true,
      },
      where: {
        programId,
        partnerId,
      },
    }),
  ]);

  const { program, links } = programEnrollment;

  return {
    program,
    links,
    reward,
    discount,
    payouts: payouts.map((payout) => ({
      status: payout.status,
      amount: payout._sum.amount ?? 0,
    })),
    stats: {
      clicks: links.reduce((acc, link) => acc + link.clicks, 0),
      leads: links.reduce((acc, link) => acc + link.leads, 0),
      sales: links.reduce((acc, link) => acc + link.sales, 0),
    },
  };
};
