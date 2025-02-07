import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getSaleAmountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/sales/amount
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const parsed = getSaleAmountQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates(parsed);

    const { partnerId } = parsed;

    const saleAmount = await prisma.commission.aggregate({
      where: {
        type: "sale",
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
      amount: saleAmount._sum.amount,
    });
  },
);
