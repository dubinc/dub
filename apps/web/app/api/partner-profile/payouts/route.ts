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
  const { programId, status, sortBy, sortOrder, page, pageSize } =
    payoutsQuerySchema.parse(searchParams);

  const payouts = await prisma.payout.findMany({
    where: {
      partnerId: partner.id,
      ...(programId && { programId }),
      ...(status && { status }),
    },
    include: {
      program: true,
      _count: {
        select: {
          commissions: true,
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
