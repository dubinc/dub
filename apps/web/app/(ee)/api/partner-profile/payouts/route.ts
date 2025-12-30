import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfilePayoutsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { PartnerPayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/payouts - get all payouts for a partner
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programId, status, sortBy, sortOrder, page, pageSize } =
    partnerProfilePayoutsQuerySchema.parse(searchParams);

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

  const transformedPayouts = payouts.map((payout) => {
    const mode =
      payout.mode ??
      getEffectivePayoutMode({
        payoutMode: payout.program.payoutMode,
        payoutsEnabledAt: partner.payoutsEnabledAt,
      });

    return {
      ...payout,
      mode,
      traceId: payout.stripePayoutTraceId,
    };
  });

  return NextResponse.json(
    z.array(PartnerPayoutResponseSchema).parse(transformedPayouts),
  );
});
