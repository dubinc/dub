import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payoutsQuerySchema } from "@/lib/zod/schemas/partners";
import { PayoutStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

const responseSchema = z.object({
  status: z.nativeEnum(PayoutStatus),
  _count: z.number(),
});

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { status, search, partnerId } = payoutsQuerySchema
      .omit({ sortBy: true, order: true, page: true, pageSize: true })
      .parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const payouts = await prisma.payout.groupBy({
      by: ["status"],
      where: {
        programId,
        ...(status && { status }),
        ...(search && { partner: { name: { contains: search } } }),
        ...(partnerId && { partnerId }),
      },
      _count: true,
    });

    const counts = payouts.reduce(
      (acc, p) => {
        acc[p.status] = p._count;
        return acc;
      },
      {} as Record<PayoutStatus | "all", number>,
    );

    // fill in missing statuses with 0
    Object.values(PayoutStatus).forEach((status) => {
      if (!(status in counts)) {
        counts[status] = 0;
      }
    });

    counts.all = payouts.reduce((acc, p) => acc + p._count, 0);

    return NextResponse.json(counts);
  },
);
