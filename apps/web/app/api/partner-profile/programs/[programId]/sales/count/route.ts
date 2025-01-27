import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerSalesCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/sales/count – get sales count for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const parsed = getPartnerSalesCountQuerySchema.parse(searchParams);
    const { status, customerId, payoutId } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    const salesCount = await prisma.sale.count({
      where: {
        programId: program.id,
        partnerId: partner.id,
        ...(status && { status }),
        ...(customerId && { customerId }),
        ...(payoutId && { payoutId }),
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
    });

    return NextResponse.json({ count: salesCount });
  },
);
