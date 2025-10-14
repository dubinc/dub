import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoPermission } from "@/lib/auth/partner-user-permissions";
import {
  PartnerPayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/partner-profile/payouts - get all payouts for a partner
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser }) => {
    const { programId, status, sortBy, sortOrder, page, pageSize } =
      payoutsQuerySchema.parse(searchParams);

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payouts.read",
    });

    const payouts = await prisma.payout.findMany({
      where: {
        partnerId: partner.id,
        ...(programId && { programId }),
        ...(status && { status }),
      },
      include: {
        program: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json(
      z.array(PartnerPayoutResponseSchema).parse(payouts),
    );
  },
);
