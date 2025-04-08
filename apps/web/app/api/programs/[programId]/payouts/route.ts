import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
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
      type,
      eligibility,
      invoiceId,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    const payouts = await prisma.payout.findMany({
      where: {
        programId,
        OR: [
          {
            paidAt: {
              gte: startDate.toISOString(),
              lte: endDate.toISOString(),
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: startDate.toISOString(),
              lte: endDate.toISOString(),
            },
          },
        ],
        ...(status && { status }),
        ...(partnerId && { partnerId }),
        ...(type && { type }),
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
        _count: {
          select: {
            commissions: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json(z.array(PayoutResponseSchema).parse(payouts));
  },
);
