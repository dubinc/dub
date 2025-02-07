import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import z from "@/lib/zod";
import {
  getPartnerSalesQuerySchema,
  PartnerCommissionSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/commissions – get commissions for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const {
      page,
      pageSize,
      status,
      sortBy,
      sortOrder,
      customerId,
      payoutId,
      interval,
      start,
      end,
    } = getPartnerSalesQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const commissions = await prisma.commission.findMany({
      where: {
        programId: program.id,
        partnerId: partner.id,
        AND: [
          {
            status: {
              notIn: [
                CommissionStatus.refunded,
                CommissionStatus.duplicate,
                CommissionStatus.fraud,
              ],
            },
          },
          ...(status ? [{ status }] : []),
        ],
        ...(customerId && { customerId }),
        ...(payoutId && { payoutId }),
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      select: {
        id: true,
        amount: true,
        earnings: true,
        currency: true,
        status: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        customer: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json(
      z.array(PartnerCommissionSchema).parse(commissions),
    );
  },
);
