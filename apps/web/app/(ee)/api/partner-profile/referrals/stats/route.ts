import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { networkReferralsStatsSchema } from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/partner-profile/referrals/stats
export const GET = withPartnerProfile(async ({ partner }) => {
  if (!["approved", "trusted"].includes(partner.networkStatus)) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "You must be approved in the Dub Partner Network to view referrals.",
    });
  }

  const [count, earningsAggregate] = await Promise.all([
    prisma.partner.count({
      where: {
        referredByPartnerId: partner.id,
      },
    }),

    prisma.commission.aggregate({
      where: {
        partnerId: partner.id,
        programId: NETWORK_PROGRAM_ID,
        type: CommissionType.referral,
      },
      _sum: {
        earnings: true,
      },
    }),
  ]);

  const response = networkReferralsStatsSchema.parse({
    count,
    totalEarnings: earningsAggregate._sum.earnings ?? 0,
  });

  return NextResponse.json(response);
});
