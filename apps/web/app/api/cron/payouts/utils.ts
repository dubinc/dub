import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";

// Payout are calcuated at the end of the month
export const processMonthlyPartnerPayouts = async () => {
  const partners = await prisma.programEnrollment.findMany({
    where: {
      status: "approved",
    },
  });

  if (!partners.length) {
    return;
  }

  // TODO:
  // We need a batter way to handle this recursively
  for (const { programId, partnerId } of partners) {
    await createPartnerPayouts({
      programId,
      partnerId,
    });
  }
};

export const createPartnerPayouts = async ({
  programId,
  partnerId,
}: {
  programId: string;
  partnerId: string;
}) => {
  await prisma.$transaction(async (tx) => {
    const currentDate = new Date();
    const periodStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const periodEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    // Calculate the commission earned for the partner for the given program
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
        currency: "USD",
        status: "pending",
        periodStart,
        periodEnd,
      },
    });

    // Update the sales records
    await tx.sale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: { payoutId: payout.id, status: "processed" },
    });

    console.info("Payout created", payout);
  });
};
