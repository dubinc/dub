import { withPartnerProfile } from "@/lib/auth/partner";
import { programScopeFilter } from "@/lib/auth/partner-users/program-scope-filter";
import { throwIfNoProgramAccess } from "@/lib/auth/partner-users/throw-if-no-access";
import { payoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { PayoutStatus, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/payouts/count – get payouts count for a partner
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser }) => {
    const { programId, groupBy, status } =
      payoutsCountQuerySchema.parse(searchParams);

    throwIfNoProgramAccess({
      programId,
      partnerUser,
    });

    const where: Prisma.PayoutWhereInput = {
      partnerId: partner.id,
      ...(programId && { programId }),
      ...programScopeFilter(partnerUser.assignedProgramIds),
    };

    if (groupBy === "status") {
      const payouts = await prisma.payout.groupBy({
        by: ["status"],
        where: where,
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
  },
  {
    requiredPermission: "payouts.read",
  },
);
