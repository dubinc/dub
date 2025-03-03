import { embedToken } from "@/lib/embed/embed-token";
import { determinePartnerDiscount } from "@/lib/partners/determine-partner-discount";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { prisma } from "@dub/prisma";
import { notFound } from "next/navigation";

export const getEmbedData = async (token: string) => {
  const { programId, partnerId } = (await embedToken.get(token)) ?? {};

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

  const [reward, discount] = await Promise.all([
    determinePartnerReward({
      programId,
      partnerId,
      event: "sale",
    }),

    determinePartnerDiscount({
      programId,
      partnerId,
    }),
  ]);

  const { program, links } = programEnrollment;

  const payouts = await prisma.payout.groupBy({
    by: ["status"],
    _sum: {
      amount: true,
    },
    where: {
      programId: program.id,
      partnerId: programEnrollment?.partnerId,
    },
  });

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
