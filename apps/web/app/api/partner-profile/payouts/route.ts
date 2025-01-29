import { withPartnerProfile } from "@/lib/auth/partner";
import {
  PartnerPayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/partner-profile/payouts - get all payouts for a partner
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { status, sortBy, sortOrder, page, pageSize } =
    payoutsQuerySchema.parse(searchParams);

  const payouts = await prisma.payout.findMany({
    where: {
      partnerId: partner.id,
      ...(status && { status }),
    },
    include: {
      program: true,
      _count: {
        select: {
          sales: true,
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return NextResponse.json(z.array(PartnerPayoutResponseSchema).parse(payouts));
});
