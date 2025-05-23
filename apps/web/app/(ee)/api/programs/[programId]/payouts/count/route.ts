import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { payoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { PayoutStatus, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const {
      partnerId,
      groupBy,
      eligibility,
      status,
      invoiceId,
      excludeCurrentMonth,
    } = payoutsCountQuerySchema.parse(searchParams);

    const { minPayoutAmount } = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

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
      if (!excludeCurrentMonth) {
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

      // Special case for excludeCurrentMonth on the payout invoice sheet
      const [commissions, customPayouts] = await Promise.all([
        prisma.commission.groupBy({
          by: ["payoutId"],
          where: {
            programId,
            payout: {
              amount: {
                gte: minPayoutAmount,
              },
              status: "pending",
            },
            partner: {
              payoutsEnabledAt: {
                not: null,
              },
            },
            createdAt: {
              lt: currentMonthStart,
            },
          },
          _sum: {
            earnings: true,
          },
        }),

        // custom payouts are included by default
        prisma.payout.aggregate({
          where: {
            programId,
            amount: {
              gte: minPayoutAmount,
            },
            partner: {
              payoutsEnabledAt: {
                not: null,
              },
            },
            status: "pending",
            periodStart: null,
            periodEnd: null,
          },
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ]);

      const allCommissions = commissions.filter(
        (c) => (c._sum.earnings ?? 0) >= minPayoutAmount,
      );

      const counts = {
        status: "pending",
        count: allCommissions.length + customPayouts._count,
        amount:
          allCommissions.reduce((acc, c) => acc + (c._sum.earnings ?? 0), 0) +
          (customPayouts._sum.amount ?? 0),
      };

      return NextResponse.json([counts]);
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
