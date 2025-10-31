import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { generateRandomName } from "@/lib/names";
import { REFERRALS_EMBED_EARNINGS_LIMIT } from "@/lib/partners/constants";
import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/embed/referrals/earnings – get commissions for a partner from an embed token
export const GET = withReferralsEmbedToken(
  async ({ programEnrollment, searchParams }) => {
    const { page } = z
      .object({ page: z.coerce.number().optional().default(1) })
      .parse(searchParams);

    const earnings = await prisma.commission.findMany({
      where: {
        earnings: {
          gt: 0,
        },
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
      },
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
    });

    return NextResponse.json(
      z.array(PartnerEarningsSchema).parse(
        earnings.map((e) => ({
          ...e,
          customer: e.customer
            ? {
                ...e.customer,
                email: e.customer.email
                  ? programEnrollment.customerDataSharingEnabledAt
                    ? e.customer.email
                    : e.customer.email.replace(/(?<=^.).+(?=.@)/, "****")
                  : e.customer.name || generateRandomName(),
              }
            : null,
        })),
      ),
    );
  },
);
