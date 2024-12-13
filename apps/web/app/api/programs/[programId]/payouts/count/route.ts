import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { payoutCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { PayoutStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { status, search, partnerId, groupBy } =
      payoutCountQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    // Get payout count by status
    if (groupBy === "status") {
      const payouts = await prisma.payout.groupBy({
        by: ["status"],
        where: {
          programId,
          ...(status && { status }),
          ...(search && { partner: { name: { contains: search } } }),
          ...(partnerId && { partnerId }),
        },
        _count: true,
        _sum: {
          amount: true,
        },
      });

      const counts = payouts.map((p) => ({
        status: p.status,
        count: p._count,
        amount: p._sum.amount,
      }));

      Object.values(PayoutStatus).forEach((status) => {
        if (!counts.find((p) => p.status === status)) {
          counts.push({
            status,
            count: 0,
            amount: 0,
          });
        }
      });

      return NextResponse.json(counts);
    }

    const count = await prisma.payout.count({
      where: {
        programId,
        ...(partnerId && { partnerId }),
      },
    });

    return NextResponse.json(count);
  },
);
