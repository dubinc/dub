import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { booleanQuerySchema } from "@/lib/zod/schemas/misc";
import { PayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { Commission } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

const confirmPayoutsQuerySchema = z.object({
  excludeCurrentMonth: booleanQuerySchema.optional(),
});

/*
 * GET /api/programs/[programId]/payouts/confirm - get list of payouts to confirm
 *
 * We're splitting this out of /payouts because it's a special case that needs
 * to be handled differently:
 * - only include eligible payouts
 * - no pagination or filtering (we retrieve all pending payouts by default)
 * - sort by amount in descending order
 * - option to exclude current month's commissions
 */

export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { excludeCurrentMonth } = confirmPayoutsQuerySchema.parse(searchParams);

  const { minPayoutAmount } = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const payouts = await prisma.payout.findMany({
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
      ...(excludeCurrentMonth && {
        commissions: {
          where: {
            createdAt: {
              lt: currentMonthStart,
            },
          },
        },
      }),
    },
    orderBy: {
      amount: "desc",
    },
  });

  const result = excludeCurrentMonth
    ? excludeCurrentMonthCommissions({
        payouts,
        minPayoutAmount,
      })
    : payouts;

  return NextResponse.json(z.array(PayoutResponseSchema).parse(result));
});

// Exclude the current month's commissions from the payouts
const excludeCurrentMonthCommissions = ({
  payouts,
  minPayoutAmount,
}: {
  payouts: (z.infer<typeof PayoutResponseSchema> & {
    commissions: Commission[];
  })[];
  minPayoutAmount: number;
}) => {
  const allPayouts = payouts.map((payout) => {
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
  });

  return allPayouts.filter((payout) => payout.amount >= minPayoutAmount);
};
