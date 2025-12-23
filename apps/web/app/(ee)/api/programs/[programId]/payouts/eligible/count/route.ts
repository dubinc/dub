import { getEligiblePayouts } from "@/lib/api/payouts/get-eligible-payouts";
import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { CUTOFF_PERIOD } from "@/lib/partners/cutoff-period";
import { eligiblePayoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

/*
 * GET /api/programs/[programId]/payouts/eligible/count - get count of eligible payouts
 */
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { cutoffPeriod, selectedPayoutId, excludedPayoutIds } =
    eligiblePayoutsCountQuerySchema.parse(searchParams);

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  // Requires special re-computing and filtering of payouts, so we just have to fetch all of them
  if (cutoffPeriodValue) {
    const eligiblePayouts = await getEligiblePayouts({
      program,
      cutoffPeriod,
      selectedPayoutId,
      excludedPayoutIds,
      pageSize: Infinity,
      page: 1,
    });

    return NextResponse.json({
      count: eligiblePayouts.length ?? 0,
      amount: eligiblePayouts.reduce((acc, payout) => acc + payout.amount, 0),
    });
  }

  const data = await prisma.payout.aggregate({
    where: {
      ...(selectedPayoutId
        ? { id: selectedPayoutId }
        : excludedPayoutIds && excludedPayoutIds.length > 0
          ? { id: { notIn: excludedPayoutIds } }
          : {}),
      ...getPayoutEligibilityFilter(program),
    },
    _count: true,
    _sum: {
      amount: true,
    },
  });

  return NextResponse.json({
    count: data._count ?? 0,
    amount: data._sum?.amount ?? 0,
  });
});
