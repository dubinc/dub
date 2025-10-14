import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/partner-profile/invites/accept – accept a partner invite
export const POST = withSession(async ({ session }) => {
  const invite = await prisma.partnerInvite.findFirst({
    where: {
      email: session.user.email,
    },
    include: {
      partner: true,
    },
  });

  if (!invite) {
    throw new DubApiError({
      code: "not_found",
      message: "No invitation found for your email.",
    });
  }

  if (invite.expires < new Date()) {
    throw new DubApiError({
      code: "invite_expired",
      message: "The invitation has been expired.",
    });
  }

  const partner = invite.partner;

  const existingPartnerUser = await prisma.partnerUser.findUnique({
    where: {
      userId_partnerId: {
        userId: session.user.id,
        partnerId: partner.id,
      },
    },
  });

  if (existingPartnerUser) {
    throw new DubApiError({
      code: "conflict",
      message: "You are already a member of this partner profile.",
    });
  }

  await Promise.all([
    prisma.partnerUser.create({
      data: {
        userId: session.user.id,
        role: invite.role,
        partnerId: partner.id,
        notificationPreferences: {
          create: {},
        },
      },
    }),

    prisma.partnerInvite.delete({
      where: {
        email_partnerId: {
          email: session.user.email,
          partnerId: partner.id,
        },
      },
    }),

    session.user["defaultPartnerId"] === null &&
      prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          defaultPartnerId: partner.id,
        },
      }),
  ]);

  return NextResponse.json({
    message: "You are now a member of this partner profile.",
  });
});
