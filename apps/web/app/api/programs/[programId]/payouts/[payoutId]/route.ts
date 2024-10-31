import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PartnerSchema,
  PayoutSchema,
  SaleSchema,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import z from "zod";

export const responseSchema = PayoutSchema.and(
  z.object({
    partner: PartnerSchema,
    sales: z.array(SaleSchema),
    _count: z.object({ sales: z.number() }),
  }),
);

// GET /api/programs/[programId]/payouts/[payoutId] - get a payout by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId, payoutId } = params;

  const payout = await prisma.payout.findUniqueOrThrow({
    where: {
      id: payoutId,
      program: {
        id: programId,
        workspaceId: workspace.id,
      },
    },
    include: {
      partner: true,
      sales: true,
      _count: {
        select: { sales: true },
      },
    },
  });

  console.log(payout);

  return NextResponse.json(responseSchema.parse(payout));
});
