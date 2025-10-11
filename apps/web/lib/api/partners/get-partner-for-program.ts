import { prisma } from "@dub/prisma";

export async function getPartnerForProgram({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) {
  const data = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partner: {
        include: {
          industryInterests: true,
          preferredEarningStructures: true,
          salesChannels: true,
        },
      },
      links: true,
    },
  });

  if (!data) {
    return null;
  }

  const { partner, links, ...programEnrollment } = data;

  return {
    ...partner,
    ...programEnrollment,
    netRevenue:
      programEnrollment.totalSaleAmount - programEnrollment.totalCommissions,
    id: partner.id,
    createdAt: new Date(programEnrollment.createdAt),
    links,
    lastLeadAt: links.reduce((acc, link) => {
      return link.lastLeadAt && link.lastLeadAt > (acc ?? new Date(0))
        ? link.lastLeadAt
        : acc;
    }, undefined),
    lastConversionAt: links.reduce((acc, link) => {
      return link.lastConversionAt &&
        link.lastConversionAt > (acc ?? new Date(0))
        ? link.lastConversionAt
        : acc;
    }, undefined),
    industryInterests: partner.industryInterests,
    preferredEarningStructures: partner.preferredEarningStructures,
    salesChannels: partner.salesChannels,
  };
}
