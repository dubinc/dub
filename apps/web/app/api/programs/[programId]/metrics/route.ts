import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/stats - get stats for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { interval = "30d", start, end } = searchParams;
    const { startDate, endDate } = getStartEndDates({ interval, start, end });

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: params.programId,
    });

    const where = {
      programId: program.id,
      createdAt: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
    };

    const [payouts, revenue, salesCount, partnersCount] = await Promise.all([
      prisma.payout.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),

      prisma.sale.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),

      prisma.sale.count({
        where,
      }),

      prisma.programEnrollment.count({
        where: {
          programId: program.id,
        },
      }),
    ]);

    return NextResponse.json({
      revenue: revenue._sum.amount,
      payouts: payouts._sum.amount,
      salesCount,
      partnersCount,
    });
  },
);
