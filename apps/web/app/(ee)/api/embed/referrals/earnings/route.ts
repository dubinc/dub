import { getEarningsForPartner } from "@/lib/api/partner-profile/get-earnings-for-partner";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { getPartnerEarningsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = getPartnerEarningsQuerySchema
  .pick({
    start: true,
    end: true,
    page: true,
    pageSize: true,
    interval: true,
    timezone: true,
  })
  .extend({
    withTotal: z
      .string()
      .optional()
      .transform((v) => v?.toLowerCase() === "true")
      .default(false),
  });

// GET /api/embed/referrals/earnings – get commissions for a partner from an embed token
export const GET = withReferralsEmbedToken(
  async ({ programEnrollment, searchParams }) => {
    const { withTotal, start, end, pageSize, page, interval, timezone } =
      querySchema.parse(searchParams);

    const [earnings, total] = await Promise.all([
      getEarningsForPartner({
        page,
        pageSize,
        start,
        end,
        interval,
        timezone,
        sortBy: "createdAt",
        sortOrder: "desc",
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        customerDataSharingEnabledAt:
          programEnrollment.customerDataSharingEnabledAt,
      }),

      withTotal
        ? prisma.commission.count({
            where: {
              earnings: {
                not: 0,
              },
              programId: programEnrollment.programId,
              partnerId: programEnrollment.partnerId,
              ...(start || end
                ? {
                    createdAt: {
                      ...(start && { gte: start }),
                      ...(end && { lte: end }),
                    },
                  }
                : {}),
            },
          })
        : Promise.resolve(null),
    ]);

    if (withTotal) {
      return NextResponse.json({
        data: earnings,
        total,
      });
    }

    return NextResponse.json(earnings);
  },
);
