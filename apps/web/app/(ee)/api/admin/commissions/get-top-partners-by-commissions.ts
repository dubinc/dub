import { prisma } from "@/lib/prisma";

/** Average payout fee used when program-level fee rates aren't available. */
const AVERAGE_PARTNER_PAYOUT_FEE = 0.03;

export async function getTopPartnersByCommissions({
  programId,
  partnerId,
  startDate,
  endDate,
}: {
  programId?: string;
  partnerId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const partnerCommissions = await prisma.commission.groupBy({
    by: ["partnerId"],
    _sum: {
      earnings: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["pending", "processed", "paid"],
      },
      program: {
        environment: "production",
      },
      ...(programId ? { programId } : {}),
      ...(partnerId ? { partnerId } : {}),
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
    take: 150,
  });

  const partners = await prisma.partner.findMany({
    where: {
      id: {
        in: partnerCommissions.map(({ partnerId }) => partnerId),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      country: true,
    },
  });

  const partnerById = Object.fromEntries(
    partners.map((partner) => [partner.id, partner]),
  );

  return partnerCommissions
    .flatMap(({ partnerId, _sum }) => {
      const partner = partnerById[partnerId];
      if (!partner) return [];

      const commissions = _sum.earnings || 0;

      return [
        {
          ...partner,
          commissions,
          fees: Math.round(commissions * AVERAGE_PARTNER_PAYOUT_FEE),
        },
      ];
    })
    .slice(0, 100);
}
