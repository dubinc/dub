import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/stats - get stats for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId: params.programId,
  });

  const [payouts, revenue, salesCount, partnersCount] = await Promise.all([
    prisma.payout.aggregate({
      where: {
        programId: program.id,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.sale.aggregate({
      where: {
        programId: program.id,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.sale.count({
      where: {
        programId: program.id,
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
});
