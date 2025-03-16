import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import z from "@/lib/zod";
import {
  PartnerEarningsSchema,
  getPartnerEarningsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings – get earnings for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const {
      page,
      pageSize,
      type,
      status,
      sortBy,
      sortOrder,
      linkId,
      customerId,
      payoutId,
      interval,
      start,
      end,
    } = getPartnerEarningsQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const earnings = await prisma.commission.findMany({
      where: {
        programId: program.id,
        partnerId: partner.id,
        type,
        status,
        linkId,
        customerId,
        payoutId,
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
        link: {
          select: {
            id: true,
            shortLink: true,
            url: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    const data = z.array(PartnerEarningsSchema).parse(
      earnings.map((e) => ({
        ...e,
        customer: e.customer
          ? {
              ...e.customer,
              // fallback to a random name if the customer doesn't have an email
              email:
                e.customer.email ?? e.customer.name ?? generateRandomName(),
            }
          : null,
      })),
    );

    return NextResponse.json(data);
  },
);
