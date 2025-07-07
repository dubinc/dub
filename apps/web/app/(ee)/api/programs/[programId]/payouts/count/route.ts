import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { payoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { PayoutStatus, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { partnerId, groupBy, eligibility, status, invoiceId } =
    payoutsCountQuerySchema.parse(searchParams);

  const { minPayoutAmount } = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const where: Prisma.PayoutWhereInput = {
    programId,
    ...(partnerId && { partnerId }),
    ...(eligibility === "eligible" && {
      amount: {
        gte: minPayoutAmount,
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
      },
    }),
    ...(invoiceId && { invoiceId }),
  };

  // Get payout count by status
  if (groupBy === "status") {
    const payouts = await prisma.payout.groupBy({
      by: ["status"],
      where,
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
      ...where,
      status,
    },
  });

  return NextResponse.json(count);
});
