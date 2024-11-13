import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutWithSalesSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

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
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return NextResponse.json(PayoutWithSalesSchema.parse(payout));
});
