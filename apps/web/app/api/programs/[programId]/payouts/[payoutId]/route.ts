import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CustomerSchema,
  PartnerSchema,
  PayoutSchema,
  SaleSchema,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import z from "zod";

export const responseSchema = PayoutSchema.and(
  z.object({
    partner: PartnerSchema,
    sales: z.array(
      SaleSchema.extend({
        customer: CustomerSchema,
      }),
    ),
    _count: z.object({ sales: z.number() }),
  }),
);

// GET /api/programs/[programId]/payouts/[payoutId] - get a payout by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId, payoutId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const payout = await prisma.payout.findUniqueOrThrow({
    where: {
      id: payoutId,
      programId,
    },
    include: {
      partner: true,
      sales: {
        include: {
          customer: true,
        },
      },
      _count: {
        select: { sales: true },
      },
    },
  });

  return NextResponse.json(responseSchema.parse(payout));
});
