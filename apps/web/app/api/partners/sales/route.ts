import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth/workspace";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { updatePartnerSaleSchema } from "@/lib/zod/schemas/partners";
import { ProgramSaleSchema } from "@/lib/zod/schemas/program-sales";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/partners/sales - update a sale
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const { programId, invoiceId, amount } = updatePartnerSaleSchema.parse(
      await parseRequestBody(req),
    );

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const sale = await prisma.commission.findUnique({
      where: {
        programId_invoiceId: {
          programId: program.id,
          invoiceId,
        },
      },
      include: {
        partner: true,
      },
    });

    if (!sale) {
      throw new DubApiError({
        code: "not_found",
        message: `Sale with invoice ID ${invoiceId} not found for program ${programId}.`,
      });
    }

    if (sale.status === "paid") {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot update amount: Sale with invoice ID ${invoiceId} has already been paid.`,
      });
    }

    const { partner } = sale;

    const reward = await determinePartnerReward({
      event: "sale",
      partnerId: partner.id,
      programId: program.id,
    });

    if (!reward) {
      throw new DubApiError({
        code: "not_found",
        message: `No reward found for partner ${partner.id} in program ${program.id}.`,
      });
    }

    // Recalculate the earnings based on the new amount
    const earnings = calculateSaleEarnings({
      reward,
      sale: {
        amount,
        quantity: sale.quantity,
      },
    });

    const updatedSale = await prisma.commission.update({
      where: {
        id: sale.id,
      },
      data: {
        amount,
        earnings,
      },
    });

    // If the sale has already been paid, we need to update the payout
    if (sale.status === "processed" && sale.payoutId) {
      const earningsDifference = earnings - sale.earnings;

      await prisma.payout.update({
        where: {
          id: sale.payoutId,
        },
        data: {
          amount: {
            ...(earningsDifference < 0
              ? { decrement: Math.abs(earningsDifference) }
              : { increment: earningsDifference }),
          },
        },
      });
    }

    return NextResponse.json(ProgramSaleSchema.parse(updatedSale));
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "enterprise",
    ],
  },
);
