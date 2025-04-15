import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
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

    const parsed = getCommissionsCountQuerySchema.parse(searchParams);
    const { status, type, partnerId, payoutId, customerId } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    const commissionsCount = await prisma.commission.groupBy({
      by: ["status"],
      where: {
        earnings: {
          gt: 0,
        },
        programId,
        partnerId,
        status,
        type,
        payoutId,
        customerId,
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      _count: true,
      _sum: {
        amount: true,
        earnings: true,
      },
    });

    const counts = commissionsCount.reduce(
      (acc, p) => {
        acc[p.status] = {
          count: p._count,
          amount: p._sum.amount ?? 0,
          earnings: p._sum.earnings ?? 0,
        };
        return acc;
      },
      {} as Record<
        CommissionStatus | "all",
        {
          count: number;
          amount: number;
          earnings: number;
        }
      >,
    );

    // fill in missing statuses with 0
    Object.values(CommissionStatus).forEach((status) => {
      if (!(status in counts)) {
        counts[status] = {
          count: 0,
          amount: 0,
          earnings: 0,
        };
      }
    });

    counts.all = commissionsCount.reduce(
      (acc, p) => ({
        count: acc.count + p._count,
        amount: acc.amount + (p._sum.amount ?? 0),
        earnings: acc.earnings + (p._sum.earnings ?? 0),
      }),
      { count: 0, amount: 0, earnings: 0 },
    );
    return NextResponse.json(counts);
  },
);
