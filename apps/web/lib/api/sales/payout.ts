import { prisma } from "@/lib/prisma";
import { createId } from "../utils";

// Payout are calcuated at the end of the month
export const processProgramsPayouts = async () => {
  const partners = await prisma.programEnrollment.findMany();

  if (!partners.length) {
    return;
  }

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
    // Calculate the commission earned for the partner for the given program
    const sales = await tx.sale.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
      },
      select: {
        id: true,
        commissionEarned: true,
      },
    });

    if (!sales.length) {
      return;
    }

    const program = await tx.program.findUniqueOrThrow({
      where: { id: programId },
      select: { minimumPayout: true },
    });

    const payoutFee = 0; // TODO: Implement payout fee
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

    const commissionEarnedTotal = sales.reduce(
      (total, sale) => total + sale.commissionEarned,
      0,
    );

    if (commissionEarnedTotal < program.minimumPayout) {
      console.info("Minimum payout not met. Skipping payout creation.", {
        programId,
        partnerId,
        commissionEarnedTotal,
        minimumPayout: program.minimumPayout,
      });

      return;
    }

    // Create the payout
    const payout = await tx.payout.create({
      data: {
        id: createId({ prefix: "" }),
        programId,
        partnerId,
        payoutFee,
        total: commissionEarnedTotal,
        netTotal: commissionEarnedTotal - payoutFee,
        currency: "USD",
        status: "pending",
        periodStart,
        periodEnd,
      },
    });

    // Update the sales to be included in the payout
    await tx.sale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: { payoutId: payout.id },
    });

    console.info("Payout created", payout);
  });
};
