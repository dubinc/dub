import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payoutsQuerySchema } from "@/lib/zod/schemas/partners";
import { PayoutStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

const responseSchema = z.object({
  status: z.nativeEnum(PayoutStatus).or(z.literal("all")),
  _count: z.number(),
});

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { status, search } = payoutsQuerySchema
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
      },
      _count: true,
    });

    const counts = Object.values(PayoutStatus).map((status) => ({
      status,
      _count: payouts.find((p) => p.status === status)?._count || 0,
    }));

    return NextResponse.json([
      ...z.array(responseSchema).parse(counts),
      { status: "all", _count: payouts.reduce((acc, p) => acc + p._count, 0) },
    ]);
  },
);
