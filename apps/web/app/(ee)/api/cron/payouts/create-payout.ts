import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { endOfMonth } from "date-fns";

export const createPayout = async ({
  programId,
  partnerId,
}: {
  programId: string;
  partnerId: string;
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
        earnings: {
          gt: 0,
        },
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

  const commonWhere: Prisma.CommissionWhereInput = {
    programId,
    partnerId,
    status: "pending",
    payoutId: null,
  };

  const [commissions, clawbacks] = await Promise.all([
    // Find all pending commissions
    // We only process commissions that were created before the holding period
    prisma.commission.findMany({
      where: {
        earnings: {
          gt: 0,
        },
        ...commonWhere,
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
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    // Find all pending clawbacks
    // We don't wait for the holding period to be over for clawbacks
    prisma.commission.findMany({
      where: {
        earnings: {
          lt: 0,
        },
        ...commonWhere,
      },
      select: {
        id: true,
        createdAt: true,
        earnings: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  if (commissions.length === 0 && clawbacks.length === 0) {
    return;
  }

  console.log(
    `Found ${commissions.length} pending commissions for partner ${partnerId} in program ${programId}.`,
  );

  console.log(
    `Found ${clawbacks.length} pending clawbacks for partner ${partnerId} in program ${programId}.`,
  );

  // sort the commissions and clawbacks by createdAt
  const allCommissions = [...commissions, ...clawbacks].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // earliest commission date
  const periodStart = allCommissions[0].createdAt;

  // end of the month of the latest commission date
  // e.g. if the latest sale is 2024-12-16, the periodEnd should be 2024-12-31
  const periodEnd = endOfMonth(
    allCommissions[allCommissions.length - 1].createdAt,
  );

  await prisma.$transaction(async (tx) => {
    // check if the partner has another pending payout (take the latest entry)
    let payout = await tx.payout.findFirst({
      where: {
        programId,
        partnerId,
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // if the partner has no pending payout, create a new one
    if (!payout) {
      console.log("No existing payout found, creating new one.");
      payout = await tx.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          periodStart,
          periodEnd,
          description: "Dub Partners payout",
        },
      });
    }

    console.log(`Using payout ID ${payout.id}.`);

    // update the commissions to processed and set the payoutId
    await tx.commission.updateMany({
      where: {
        id: {
          in: allCommissions.map(({ id }) => id),
        },
      },
      data: {
        status: "processed",
        payoutId: payout.id,
      },
    });

    console.log(
      `Updated ${allCommissions.length} commissions to processed and set payoutId to ${payout.id}.`,
    );

    // get the total earnings for the commissions in the payout
    const commissionAggregate = await tx.commission.aggregate({
      where: {
        payoutId: payout.id,
      },
      _sum: {
        earnings: true,
      },
    });

    const newPayoutAmount = commissionAggregate._sum.earnings ?? 0;

    console.log(
      `Updating aggregated earnings for payout ${payout.id}: ${newPayoutAmount}`,
    );

    // update the payout amount
    await tx.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        amount: newPayoutAmount,
        periodEnd,
      },
    });
  });
};
