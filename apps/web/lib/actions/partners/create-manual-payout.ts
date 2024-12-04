"use server";

import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { createId } from "@/lib/api/utils";
import { createSalesPayout } from "@/lib/partners/create-sales-payout";
import { prisma } from "@/lib/prisma";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { Payout, Program } from "@prisma/client";
import { authActionClient } from "../safe-action";

const schema = createManualPayoutSchema.refine(
  (data) => {
    return data.type === "custom" || (data.start && data.end);
  },
  {
    message: "Please select a date range",
    path: ["start"],
  },
);

export const createManualPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, start, end, type, amount, description } =
      parsedInput;

    const [program, programEnrollment] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        select: {
          dotsUserId: true,
          linkId: true,
        },
      }),
    ]);

    if (!programEnrollment.linkId) {
      throw new Error("No short link found for this partner in this program.");
    }

    let payout: Payout | undefined = undefined;

    // Create a payout for sales
    if (type === "sales") {
      // commission amount changed for this payout
      // recalculate the earnings for each sale within the period
      if (program.commissionAmount !== amount) {
        await updateSalesEarnings({
          start: start!,
          end: end!,
          partnerId,
          program: {
            commissionAmount: amount,
            commissionType: program.commissionType,
          },
        });
      }

      payout = await createSalesPayout({
        programId,
        partnerId,
        periodStart: start!,
        periodEnd: end!,
      });
    }

    // Create a payout for clicks, leads, and custom events
    else {
      let quantity: number | undefined = undefined;

      if (type === "clicks" || type === "leads") {
        const count = await getAnalytics({
          linkId: programEnrollment.linkId,
          event: type,
          groupBy: "count",
          start,
          end,
        });

        quantity = count[type];
      }

      const amountInCents = (quantity || 1) * (amount || 0);
      const fee = amountInCents * 0.02;

      payout = await prisma.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          fee,
          type,
          quantity,
          amount: amountInCents,
          total: amountInCents + fee,
          periodStart: start,
          periodEnd: end,
          description,
        },
      });
    }

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    return payout;
  });

// Recalculate earnings for sale based on new commission amount
const updateSalesEarnings = async ({
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
      status: "pending",
      partnerId,
      createdAt: {
        gte: start.toISOString(),
        lte: end.toISOString(),
      },
    },
  });

  if (!sales.length) {
    throw new Error("No sales found for this period.");
  }

  const { commissionAmount, commissionType } = program;

  // Calculate the new earnings for each sale
  const updatedEarnings = sales.map((sale) => {
    return {
      saleId: sale.id,
      commissionAmount,
      earnings: calculateEarnings({
        program: {
          commissionAmount,
          commissionType,
        },
        sales: 1,
        saleAmount: sale.amount,
      }),
    };
  });

  await Promise.all(
    updatedEarnings.map(({ saleId, commissionAmount, earnings }) =>
      prisma.sale.update({
        where: { id: saleId },
        data: {
          commissionAmount,
          earnings,
        },
      }),
    ),
  );
};
