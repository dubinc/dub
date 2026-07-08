import { buildProgramEnrollmentFilter } from "@/lib/api/payouts/get-payouts";
import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { PayoutStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/payouts/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { status, partnerId, groupId, groupBy, eligibility, invoiceId } =
    payoutsCountQuerySchema.parse(searchParams);

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const programEnrollment = buildProgramEnrollmentFilter({
    groupId,
  });

  const where: Prisma.PayoutWhereInput = {
    programId,
    ...(partnerId && { partnerId }),
    ...(eligibility === "eligible" && {
      ...getPayoutEligibilityFilter({ program }),
    }),
    ...(invoiceId && { invoiceId }),
    ...(programEnrollment && { programEnrollment }),
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

  const count = await prisma.payout.aggregate({
    where: {
      ...where,
      status,
    },
    _count: true,
    _sum: {
      amount: true,
    },
  });

  return NextResponse.json([
    {
      count: count._count ?? 0,
      amount: count._sum?.amount ?? 0,
      status: status ?? "all",
    },
  ]);
});
