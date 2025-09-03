import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_ENUM,
} from "@/lib/partners/cutoff-period";
import { PayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "zod";

const confirmPayoutsQuerySchema = z.object({
  cutoffPeriod: CUTOFF_PERIOD_ENUM,
});

/*
 * GET /api/programs/[programId]/payouts/eligible - get list of eligible payouts
 *
 * We're splitting this from /payouts because it's a special case that needs
 * to be handled differently:
 * - only include eligible payouts
 * - no pagination or filtering (we retrieve all pending payouts by default)
 * - sort by amount in descending order
 * - option to set a cutoff period to include commissions up to that date
 */

export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { cutoffPeriod } = confirmPayoutsQuerySchema.parse(searchParams);

  const { minPayoutAmount } = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  let payouts = await prisma.payout.findMany({
    where: {
      programId,
      status: "pending",
      amount: {
        gte: minPayoutAmount,
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
      },
    },
    include: {
      partner: true,
      ...(cutoffPeriodValue && {
        commissions: {
          where: {
            createdAt: {
              lt: cutoffPeriodValue,
            },
          },
        },
      }),
    },
    orderBy: {
      amount: "desc",
    },
  });

  if (cutoffPeriodValue) {
    payouts = payouts
      .map((payout) => {
        // custom payouts are included by default
        if (!payout.periodStart && !payout.periodEnd) {
          return payout;
        }

        const newPayoutAmount = payout.commissions.reduce((acc, commission) => {
          return acc + commission.earnings;
        }, 0);

        return {
          ...payout,
          amount: newPayoutAmount,
        };
      })
      .filter((payout) => payout.amount >= minPayoutAmount);
  }

  return NextResponse.json(z.array(PayoutResponseSchema).parse(payouts));
});
