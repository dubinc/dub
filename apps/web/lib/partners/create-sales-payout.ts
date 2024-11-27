import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";

// Calculate the commission earned for the partner for the given program
export const createSalesPayouts = async ({
  programId,
  partnerId,
  periodStart,
  periodEnd,
}: {
  programId: string;
  partnerId: string;
  periodStart: Date;
  periodEnd: Date;
}) => {
  return await prisma.$transaction(async (tx) => {
    const sales = await tx.sale.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
        status: "pending", // We only want to pay out sales that are pending (not refunded / fraud / duplicate)
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        // Referral commissions are held for 30 days before becoming available.
        // createdAt: {
        //   lte: subDays(new Date(), 30),
        // },
      },
      select: {
        id: true,
        earnings: true,
      },
    });

    if (!sales.length) {
      return;
    }

    const earningsTotal = sales.reduce(
      (total, sale) => total + sale.earnings,
      0,
    );

    const amount = earningsTotal;
    const fee = amount * 0.02;

    // Create the payout
    const payout = await tx.payout.create({
      data: {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount,
        fee,
        total: amount + fee,
        periodStart,
        periodEnd,
        eventCount: sales.length,
      },
    });

    // Update the sales records
    await tx.sale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: { payoutId: payout.id, status: "processed" },
    });

    console.info("Payout created", payout);

    return payout;
  });
};
