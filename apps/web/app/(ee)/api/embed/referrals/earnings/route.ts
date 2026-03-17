import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { REFERRALS_EMBED_EARNINGS_LIMIT } from "@/lib/constants/misc";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { generateRandomName } from "@/lib/names";
import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const schema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  withTotal: z.coerce.boolean().optional().default(false),
});

// GET /api/embed/referrals/earnings – get commissions for a partner from an embed token
export const GET = withReferralsEmbedToken(
  async ({ programEnrollment, searchParams }) => {
    const { page, start, end, withTotal } = schema.parse(searchParams);

    const commonWhere: Prisma.CommissionWhereInput = {
      earnings: {
        gt: 0,
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
    };

    const [earnings, total] = await Promise.all([
      prisma.commission.findMany({
        where: commonWhere,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          link: {
            select: {
              id: true,
              shortLink: true,
              url: true,
            },
          },
        },
        take: REFERRALS_EMBED_EARNINGS_LIMIT,
        skip: (page - 1) * REFERRALS_EMBED_EARNINGS_LIMIT,
        orderBy: {
          createdAt: "desc",
        },
      }),

      withTotal
        ? prisma.commission.count({
            where: commonWhere,
          })
        : Promise.resolve(null),
    ]);

    const data = z.array(PartnerEarningsSchema).parse(
      earnings.map((e) => ({
        ...e,
        customer: e.customer
          ? {
              ...e.customer,
              email: e.customer.email
                ? programEnrollment.customerDataSharingEnabledAt
                  ? e.customer.email
                  : obfuscateCustomerEmail(e.customer.email)
                : e.customer.name || generateRandomName(),
            }
          : null,
      })),
    );

    if (withTotal) {
      return NextResponse.json({
        data,
        total,
      });
    }

    return NextResponse.json(data);
  },
);
