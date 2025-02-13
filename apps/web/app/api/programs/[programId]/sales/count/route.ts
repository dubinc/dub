import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getSalesCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/sales/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const parsed = getSalesCountQuerySchema.parse(searchParams);
    const { status, partnerId, payoutId } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    const salesCount = await prisma.commission.groupBy({
      by: ["status"],
      where: {
        type: "sale",
        programId,
        status,
        partnerId,
        payoutId,
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      _count: true,
    });

    const counts = salesCount.reduce(
      (acc, p) => {
        acc[p.status] = p._count;
        return acc;
      },
      {} as Record<CommissionStatus | "all", number>,
    );

    // fill in missing statuses with 0
    Object.values(CommissionStatus).forEach((status) => {
      if (!(status in counts)) {
        counts[status] = 0;
      }
    });

    counts.all = salesCount.reduce((acc, p) => acc + p._count, 0);

    return NextResponse.json(counts);
  },
);
