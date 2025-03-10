import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { MIN_PAYOUT_AMOUNT } from "@/lib/partners/constants";
import { payoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { PayoutStatus, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const parsed = payoutsCountQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { partnerId, groupBy, eligibility, status } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    const where: Prisma.PayoutWhereInput = {
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
      ...(partnerId && { partnerId }),
      ...(eligibility === "eligible" && {
        amount: {
          gte: MIN_PAYOUT_AMOUNT,
        },
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      }),
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
  },
);
