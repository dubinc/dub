import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { calculateEarnings } from "./commission";

// Recalculate earnings for sale based on new commission amount
export const recalculateSalesEarnings = async ({
  start,
  end,
  partnerId,
  program,
}: {
  start: Date;
  end: Date;
  partnerId: string;
  program: Pick<Program, "commissionAmount" | "commissionType">;
}) => {
  const sales = await prisma.sale.findMany({
    where: {
      AND: {
        status: "pending",
        partnerId,
        createdAt: {
          gte: start.toISOString(),
          lte: end.toISOString(),
        },
      },
      OR: [
        {
          commissionAmount: {
            not: program.commissionAmount,
          },
        },
        {
          commissionType: {
            not: program.commissionType,
          },
        },
      ],
    },
    select: {
      id: true,
      amount: true,
    },
  });

  if (!sales.length) {
    return;
  }

  // Calculate the new earnings for each sale
  const updatedEarnings = sales.map((sale) => {
    return {
      saleId: sale.id,
      earnings: calculateEarnings({
        program,
        sales: 1,
        saleAmount: sale.amount,
      }),
    };
  });

  await Promise.all(
    updatedEarnings.map(({ saleId, earnings }) =>
      prisma.sale.update({
        where: { id: saleId },
        data: {
          commissionAmount: program.commissionAmount,
          commissionType: program.commissionType,
          earnings,
        },
      }),
    ),
  );
};
