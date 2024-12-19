import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import { PayoutStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/payouts/count – get payouts count for a partner
export const GET = withPartner(async ({ partner, searchParams }) => {
  const payouts = await prisma.payout.groupBy({
    by: ["status"],
    where: {
      partnerId: partner.id,
    },
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
});
