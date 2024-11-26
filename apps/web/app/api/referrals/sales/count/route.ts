import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withEmbedToken } from "@/lib/embed/auth";
import { prisma } from "@/lib/prisma";
import { getPartnerSalesCountQuerySchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/referrals/sales/count – get sales count for a link
export const GET = withEmbedToken(async ({ searchParams, link }) => {
  const parsed = getPartnerSalesCountQuerySchema.parse(searchParams);
  const { startDate, endDate } = getStartEndDates(parsed);

  const salesCount = await prisma.sale.count({
    where: {
      linkId: link.id,
      createdAt: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
    },
  });

  return NextResponse.json({ count: salesCount });
});
