import { createId } from "@/lib/api/utils";
import { prisma } from "@dub/prisma";
import { EventType, Payout } from "@dub/prisma/client";

export const createPayout = async ({
  programId,
  partnerId,
  type,
}: {
  programId: string;
  partnerId: string;
  type: EventType;
}) => {
  await prisma.$transaction(async (tx) => {
    const earnings = await tx.earnings.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
        type,
        status: "pending",
      },
      select: {
        id: true,
        createdAt: true,
        earnings: true,
        quantity: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!earnings.length) {
      console.log("No pending earnings found for processing payout.", {
        programId,
        partnerId,
        type,
      });

      return;
    }

    // get the earliest sale date
    // const periodStart = sales.reduce(
    //   (min, sale) => (sale.createdAt < min ? sale.createdAt : min),
    //   sales[0].createdAt,
    // );

    // earliest earnings date
    const periodStart = earnings[0].createdAt;

    // end of the month of the latest earnings date
    // e.g. if the latest sale is 2024-12-16, the periodEnd should be 2024-12-31
    let periodEnd = earnings[earnings.length - 1].createdAt;
    periodEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1);

    const totalQuantity = earnings.reduce(
      (total, { quantity }) => total + quantity,
      0,
    );

    const totalAmount = earnings.reduce(
      (total, { earnings }) => total + earnings,
      0,
    );

    if (totalAmount === 0) {
      console.log("Total amount is 0, skipping payout.", {
        programId,
        partnerId,
        type,
        totalQuantity,
        totalAmount,
      });

      return;
    }

    // check if the partner has another pending payout
    const existingPayout = await tx.payout.findFirst({
      where: {
        programId,
        partnerId,
        type: `${type}s`,
        status: "pending",
      },
    });

    let payout: Payout | null = null;

    if (existingPayout) {
      payout = await tx.payout.update({
        where: {
          id: existingPayout.id,
        },
        data: {
          amount: {
            increment: totalAmount,
          },
          quantity: {
            increment: totalQuantity,
          },
          periodEnd,
          description: existingPayout.description ?? "Dub Partners payout",
        },
      });
    } else {
      payout = await tx.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          periodStart,
          periodEnd,
          amount: totalAmount,
          quantity: totalQuantity,
          description: "Dub Partners payout",
          type: `${type}s`,
        },
      });
    }

    if (!payout) {
      throw new Error("Payout not created.");
    }

    await tx.earnings.updateMany({
      where: {
        id: {
          in: earnings.map(({ id }) => id),
        },
      },
      data: {
        status: "processed",
        payoutId: payout.id,
      },
    });

    console.log("Payout created", payout);
  });
};
