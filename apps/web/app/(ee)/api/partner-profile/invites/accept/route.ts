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

  const existingPartnerMembership = await prisma.partnerUser.count({
    where: {
      userId: session.user.id,
    },
  });

  if (existingPartnerMembership > 0) {
    throw new DubApiError({
      code: "conflict",
      message:
        "You’re already associated with another partner profile. A user can only belong to one partner profile at a time.",
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
