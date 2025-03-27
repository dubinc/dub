import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { SALES_PAGE_SIZE } from "@/lib/partners/constants";
import z from "@/lib/zod";
import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/earnings – get commissions for a partner from an embed token
export const GET = withReferralsEmbedToken(
  async ({ programId, partnerId, searchParams }) => {
    const { page } = z
      .object({ page: z.coerce.number().optional().default(1) })
      .parse(searchParams);

    const earnings = await prisma.commission.findMany({
      where: {
        earnings: {
          gt: 0,
        },
        programId,
        partnerId,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        earnings: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            email: true,
            avatar: true,
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
      take: SALES_PAGE_SIZE,
      skip: (page - 1) * SALES_PAGE_SIZE,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(z.array(PartnerEarningsSchema).parse(earnings));
  },
);
