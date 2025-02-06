import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getProgramMetricsQuerySchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/stats - get stats for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { interval, start, end } =
      getProgramMetricsQuerySchema.parse(searchParams);
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

      prisma.commission.aggregate({
        where: {
          ...where,
          type: "sale",
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.commission.count({
        where: {
          ...where,
          type: "sale",
        },
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
