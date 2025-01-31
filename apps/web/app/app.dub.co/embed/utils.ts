import { embedToken } from "@/lib/embed/embed-token";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { notFound } from "next/navigation";

export const getEmbedData = async (token: string) => {
  const { programId, partnerId, tenantId } =
    (await embedToken.get(token)) ?? {};

  if (!programId || (!tenantId && !partnerId)) {
    notFound();
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: tenantId
      ? { tenantId_programId: { tenantId, programId } }
      : { partnerId_programId: { partnerId: partnerId!, programId } },
    include: {
      links: true,
      program: true,
      discount: true,
    },
  });

  if (!programEnrollment) {
    notFound();
  }

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
    discount: programEnrollment.discount
      ? DiscountSchema.parse(programEnrollment.discount)
      : null,
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
