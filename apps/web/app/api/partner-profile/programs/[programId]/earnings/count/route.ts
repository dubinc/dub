import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerSalesCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/count – get earnings count for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const { type, status, customerId, payoutId, interval, start, end } =
      getPartnerSalesCountQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const count = await prisma.commission.count({
      where: {
        programId: program.id,
        partnerId: partner.id,
        ...(type && { type }),
        ...(status && { status }),
        ...(customerId && { customerId }),
        ...(payoutId && { payoutId }),
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
    });

    return NextResponse.json({ count });
  },
);
