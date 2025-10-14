import { DubApiError } from "@/lib/api/errors";
import { invitePartnerUser } from "@/lib/api/partners/invite-partner-user";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { invitePartnerMemberSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { isRejected } from "@dub/utils";
import { NextResponse } from "next/server";
import z from "zod";

const MAX_INVITES = 5;
const MAX_PARTNER_USERS = 25;

// POST /api/partner-profile/invites - invite team members
export const POST = withPartnerProfile(async ({ partner, req, session }) => {
  const invites = z
    .array(invitePartnerMemberSchema)
    .parse(await parseRequestBody(req));

  if (invites.length > MAX_INVITES) {
    throw new DubApiError({
      code: "bad_request",
      message: "You can only invite up to 10 members at a time.",
    });
  }

  const [invitesCount, partnerUsersCount, existingPartnerUsers] =
    await Promise.all([
      prisma.partnerInvite.count({
        where: {
          partnerId: partner.id,
        },
      }),

      prisma.partnerUser.count({
        where: {
          partnerId: partner.id,
        },
      }),

      prisma.partnerUser.findMany({
        where: {
          partnerId: partner.id,
          user: {
            email: {
              in: Array.from(new Set([...invites.map(({ email }) => email)])),
            },
          },
        },
        include: {
          user: true,
        },
      }),
    ]);

  const existingPartnerUsersEmails = existingPartnerUsers.map(
    ({ user }) => user?.email,
  );

  if (existingPartnerUsersEmails.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `User ${existingPartnerUsersEmails.join(", ")} already exists in this partner profile.`,
    });
  }

  if (invitesCount + partnerUsersCount + invites.length > MAX_PARTNER_USERS) {
    throw new DubApiError({
      code: "exceeded_limit",
      message: `You can only ${MAX_PARTNER_USERS} members in this partner profile.`,
    });
  }

  const results = await Promise.allSettled(
    invites.map(({ email, role }) =>
      invitePartnerUser({
        email,
        role,
        partner,
        session,
      }),
    ),
  );

  const rejectedResults = results.filter(isRejected);

  if (rejectedResults.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: "Some invitations could not be sent.",
    });
  }

  return NextResponse.json({ message: "Invite(s) sent" });
});
