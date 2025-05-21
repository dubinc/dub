import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getProgramMetricsQuerySchema,
  ProgramMetricsSchema,
} from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/metrics - get metrics for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const { interval, start, end } =
    getProgramMetricsQuerySchema.parse(searchParams);
  const { startDate, endDate } = getStartEndDates({ interval, start, end });

  const programId = getDefaultProgramIdOrThrow(workspace);

  const where = {
    programId,
    createdAt: {
      gte: startDate.toISOString(),
      lte: endDate.toISOString(),
    },
  };

  const [payouts, commissions, partnersCount] = await Promise.all([
    prisma.payout.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),

    prisma.commission.aggregate({
      where: {
        earnings: {
          gt: 0,
        },
        ...where,
      },
      _count: {
        _all: true,
      },
      _sum: {
        earnings: true,
      },
    }),

    prisma.programEnrollment.count({
      where: {
        programId,
        status: "approved",
      },
    }),
  ]);

  const response = ProgramMetricsSchema.parse({
    partnersCount,
    commissionsCount: commissions._count._all,
    commissions: commissions._sum.earnings || 0,
    payouts: payouts._sum.amount || 0,
  });

  return NextResponse.json(response);
});
