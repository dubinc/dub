import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/referrals/count
export const GET = withPartnerProfile(async ({ partner }) => {
  if (!["approved", "trusted"].includes(partner.networkStatus)) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "You must be approved in the Dub Partner Network to view referrals.",
    });
  }

  const count = await prisma.partner.count({
    where: {
      referredByPartnerId: partner.id,
    },
  });

  return NextResponse.json(count);
});
