import { createId } from "@/lib/api/create-id";
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
  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      status: true,
      program: {
        select: {
          holdingPeriodDays: true,
        },
      },
    },
  });

  if (programEnrollment.status === "banned") {
    await prisma.commission.updateMany({
      where: {
        programId,
        partnerId,
        status: "pending",
      },
      data: {
        status: "canceled",
      },
    });

    console.log("Canceled commissions for banned partner.", {
      programId,
      partnerId,
    });

    return;
  }

  const { holdingPeriodDays } = programEnrollment.program;

  await prisma.$transaction(async (tx) => {
    const commissions = await tx.commission.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
        type,
        status: "pending",
        // Only process commissions that were created before the holding period
        ...(holdingPeriodDays > 0 && {
          createdAt: {
            lt: new Date(Date.now() - holdingPeriodDays * 24 * 60 * 60 * 1000),
          },
        }),
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

    if (!commissions.length) {
      console.log("No pending commissions found for processing payout.", {
        programId,
        partnerId,
        type,
        holdingPeriodDays,
      });

      return;
    }

    // earliest commission date
    const periodStart = commissions[0].createdAt;

    // end of the month of the latest commission date
    // e.g. if the latest sale is 2024-12-16, the periodEnd should be 2024-12-31
    let periodEnd = commissions[commissions.length - 1].createdAt;
    periodEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1);

    const totalQuantity = commissions.reduce(
      (total, { quantity }) => total + quantity,
      0,
    );

    const totalAmount = commissions.reduce(
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

    await tx.commission.updateMany({
      where: {
        id: {
          in: commissions.map(({ id }) => id),
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
