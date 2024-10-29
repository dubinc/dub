import { prisma } from "@/lib/prisma";
import { createId } from "../utils";

export const processProgramsPayouts = async () => {
  const programPartners = await prisma.programEnrollment.findMany();

  if (!programPartners.length) {
    return;
  }

  for (const { programId, partnerId } of programPartners) {
    await createPartnerPayouts({
      programId,
      partnerId,
      startDate: new Date(0),
      endDate: new Date(),
    });
  }
};

// WIP
export const createPartnerPayouts = async ({
  programId,
  partnerId,
  startDate,
  endDate,
}: {
  programId: string;
  partnerId: string;
  startDate: Date;
  endDate: Date;
}) => {
  await prisma.$transaction(async (tx) => {
    // Get all unpaid sales grouped by partner and program
    const salesGroups = await tx.sale.groupBy({
      by: ["programId", "partnerId"],
      where: {
        programId,
        partnerId,
        payoutId: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        commissionEarned: true,
      },
    });

    // Find the sales that should be included in the payout
    const sales = await tx.sale.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Create payouts
    const { _sum } = salesGroups[0];

    const payout = await tx.payout.create({
      data: {
        id: createId({ prefix: "" }),
        programId,
        partnerId,
        taxes: 0,
        payoutFee: 0,
        subtotal: _sum.commissionEarned || 0,
        total: _sum.commissionEarned || 0,
        netTotal: _sum.commissionEarned || 0,
        currency: "USD",
        status: "pending",
        due: new Date(),
      },
    });

    // Update the sales to be included in the payout
    await tx.sale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: { payoutId: payout.id },
    });
  });
};
