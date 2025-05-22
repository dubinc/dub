import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { Commission } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/programs/[programId]/payouts - get all payouts for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const parsed = payoutsQuerySchema.parse(searchParams);

    const { minPayoutAmount } = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const {
      status,
      partnerId,
      eligibility,
      invoiceId,
      sortBy,
      sortOrder,
      page,
      pageSize,
      excludeCurrentMonth,
    } = parsed;

    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const payouts = await prisma.payout.findMany({
      where: {
        programId,
        ...(status && { status }),
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
      },
      include: {
        partner: true,
        user: true,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const result = excludeCurrentMonth
      ? excludeCurrentMonthCommissions(payouts)
      : payouts;

    return NextResponse.json(z.array(PayoutResponseSchema).parse(result));
  },
);

// Exclude the current month's commissions from the payouts
const excludeCurrentMonthCommissions = (
  payouts: (z.infer<typeof PayoutResponseSchema> & {
    commissions: Commission[];
  })[],
) => {
  const allPayouts = payouts.map((payout) => {
    // custom payouts
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

  return allPayouts.filter((payout) => payout.amount > 0);
};
