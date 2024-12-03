import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSalesAmountQuerySchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/sales/amount
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const parsed = getSalesAmountQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates(parsed);

    const { partnerId } = parsed;

    const salesAmount = await prisma.sale.aggregate({
      where: {
        programId,
        partnerId,
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status: "pending",
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      amount: salesAmount._sum.amount,
    });
  },
);
