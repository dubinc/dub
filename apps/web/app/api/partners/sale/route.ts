import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth/workspace";
import { SaleSchema, updateSaleSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const { programId, invoiceId, amount } = updateSaleSchema.parse(
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

    const partner = await getProgramEnrollmentOrThrow({
      programId,
      partnerId: sale.partnerId,
    });

    const earnings = calculateSaleEarnings({
      program,
      partner,
      sales: sale.quantity,
      saleAmount: amount,
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

    return NextResponse.json(SaleSchema.parse(updatedSale));
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
