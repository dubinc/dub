import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/notification-preferences – get notification preferences for the current partner+user
export const GET = withPartnerProfile(async ({ partner, session }) => {
  const response = await prisma.partnerNotificationPreferences.findFirstOrThrow(
    {
      where: {
        partnerUser: {
          partnerId: partner.id,
          userId: session.user.id,
        },
      },
      select: {
        commissionCreated: true,
        applicationApproved: true,
        newMessageFromProgram: true,
      },
    },
  );

  return NextResponse.json(response);
});
