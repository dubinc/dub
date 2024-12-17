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
  periodStart?: Date;
  periodEnd?: Date;
  description?: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    const sales = await tx.sale.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
        status: "pending", // We only want to pay out sales that are pending (not refunded / fraud / duplicate)
        // Referral commissions are held for 30 days before becoming available.
        // createdAt: {
        //   lte: subDays(new Date(), 30),
        // },
      },
      select: {
        id: true,
        earnings: true,
        createdAt: true,
      },
    });

    if (!sales.length) {
      return;
    }

    const quantity = sales.length;
    const amount = sales.reduce((total, sale) => total + sale.earnings, 0);

    let payout: Payout | null = null;

    // only create a payout if the total sale amount is greater than 0
    if (amount > 0) {
      // Check if the partner has another pending payout
      payout = await tx.payout.findFirst({
        where: {
          programId,
          partnerId,
          status: "pending",
          type: "sales",
        },
      });

      if (!periodEnd) {
        // get the end of the month of the latest sale
        // e.g. if the latest sale is 2024-12-16, the periodEnd should be 2024-12-31
        const latestSale = sales.reduce(
          (max, sale) => (sale.createdAt > max ? sale.createdAt : max),
          sales[0].createdAt,
        );
        periodEnd = new Date(
          latestSale.getFullYear(),
          latestSale.getMonth() + 1,
          0,
        );
      }

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
        if (!periodStart) {
          // get the earliest sale date
          periodStart = sales.reduce(
            (min, sale) => (sale.createdAt < min ? sale.createdAt : min),
            sales[0].createdAt,
          );
        }

        payout = await tx.payout.create({
          data: {
            id: createId({ prefix: "po_" }),
            programId,
            partnerId,
            amount,
            periodStart,
            periodEnd,
            quantity,
            description: description ?? "Dub Partners payout",
          },
        });

        console.info("Payout created", payout);
      }
    }

    // Update the sales records
    await tx.sale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: {
        status: "processed",
        ...(payout ? { payoutId: payout.id } : {}),
      },
    });

    return payout;
  });
};
