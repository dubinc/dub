import { withPartner } from "@/lib/auth/partner";
import {
  PartnerPayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/partners/[partnerId]/payouts - get all payouts for a partner
export const GET = withPartner(async ({ partner, params, searchParams }) => {
  const { status, search, sortBy, order, page, pageSize } =
    payoutsQuerySchema.parse(searchParams);

  const payouts = await prisma.payout.findMany({
    where: {
      partnerId: partner.id,
      ...(status && { status }),
      ...(search && { partner: { name: { contains: search } } }),
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
      [sortBy]: order,
    },
  });

  return NextResponse.json(z.array(PartnerPayoutResponseSchema).parse(payouts));
});
