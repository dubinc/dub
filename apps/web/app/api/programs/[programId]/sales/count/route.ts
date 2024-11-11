import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSalesCountQuerySchema } from "@/lib/zod/schemas/partners";
import { SaleStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/sales/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { status, partnerId, payoutId } =
      getSalesCountQuerySchema.parse(searchParams);

    const salesCount = await prisma.sale.groupBy({
      by: ["status"],
      where: {
        programId,
        status,
        partnerId,
        payoutId,
      },
      _count: true,
    });

    const counts = salesCount.reduce(
      (acc, p) => {
        acc[p.status] = p._count;
        return acc;
      },
      {} as Record<SaleStatus | "all", number>,
    );

    // fill in missing statuses with 0
    Object.values(SaleStatus).forEach((status) => {
      if (!(status in counts)) {
        counts[status] = 0;
      }
    });

    counts.all = salesCount.reduce((acc, p) => acc + p._count, 0);

    return NextResponse.json(counts);
  },
);
