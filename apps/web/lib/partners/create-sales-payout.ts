import { createId } from "@/lib/api/utils";
import { prisma } from "@dub/prisma";
import { Payout } from "@dub/prisma/client";

// Calculate the commission earned for the partner for the given program
export const createSalesPayout = async ({
  programId,
  partnerId,
  periodStart,
  periodEnd,
  description,
}: {
  programId: string;
  partnerId: string;
  periodStart: Date;
  periodEnd: Date;
  description?: string;
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

    const amount = sales.reduce((total, sale) => total + sale.earnings, 0);
    const quantity = sales.length;
    let payout: Payout | null = null;

    // Check if the partner has another pending payout
    payout = await tx.payout.findFirst({
      where: {
        programId,
        partnerId,
        status: "pending",
        type: "sales",
      },
    });

    // Update the existing payout
    if (payout) {
      await tx.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          amount: {
            increment: amount,
          },
          quantity: {
            increment: quantity,
          },
          periodEnd,
        },
      });

      console.info("Payout updated", payout);
    }

    // Create the payout
    else {
      payout = await tx.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          amount,
          periodStart,
          periodEnd,
          quantity,
          description,
        },
      });

      console.info("Payout created", payout);
    }

    if (!payout) {
      throw new Error(
        `Failed to create payout for ${partnerId} in ${programId}.`,
      );
    }

    // Update the sales records
    await tx.sale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: { payoutId: payout.id, status: "processed" },
    });

    return payout;
  });
};
