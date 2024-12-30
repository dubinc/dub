import { embedToken } from "@/lib/embed/embed-token";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { notFound } from "next/navigation";

export const getEmbedData = async (token: string) => {
  const linkId = await embedToken.get(token);

  if (!linkId) {
    notFound();
  }

  const referralLink = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    include: {
      program: true,
      programEnrollment: {
        select: {
          partnerId: true,
          discount: true,
        },
      },
    },
  });

  if (!referralLink?.program || !referralLink?.programEnrollment) {
    notFound();
  }

  const { program, programEnrollment, ...link } = referralLink;

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
    link,
    discount: programEnrollment.discount
      ? DiscountSchema.parse(programEnrollment.discount)
      : null,
    payouts: payouts.map((payout) => ({
      status: payout.status,
      amount: payout._sum.amount ?? 0,
    })),
  };
};
