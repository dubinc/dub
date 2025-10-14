import { DubApiError } from "@/lib/api/errors";
import { invitePartnerUser } from "@/lib/api/partners/invite-partner-user";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoPermission } from "@/lib/auth/partner-user-permissions";
import {
  MAX_INVITES_PER_REQUEST,
  MAX_PARTNER_USERS,
} from "@/lib/partners/constants";
import { invitePartnerMemberSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { isRejected, pluralize } from "@dub/utils";
import { NextResponse } from "next/server";
import z from "zod";

const removeInviteSchema = z.object({
  email: z.string().email(),
});

// POST /api/partner-profile/invites - invite team members
export const POST = withPartnerProfile(
  async ({ partner, req, session, partnerUser }) => {
    const invites = z
      .array(invitePartnerMemberSchema)
      .parse(await parseRequestBody(req));

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "user.invite",
      message: "Only owners can invite users.",
    });

    if (invites.length > MAX_INVITES_PER_REQUEST) {
      throw new DubApiError({
        code: "bad_request",
        message: "You can only invite up to 10 members at a time.",
      });
    }

    const emails = Array.from(new Set([...invites.map(({ email }) => email)]));

    const [
      invitesCount,
      partnerUsersCount,
      existingPartnerUsers,
      existingInvites,
    ] = await Promise.all([
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
              in: emails,
            },
          },
        },
        include: {
          user: true,
        },
      }),

      prisma.partnerInvite.findMany({
        where: {
          partnerId: partner.id,
          email: {
            in: emails,
          },
        },
      }),
    ]);

    // Check for users that already exist
    const existingPartnerUsersEmails = existingPartnerUsers.map(
      ({ user }) => user?.email,
    );

    if (existingPartnerUsersEmails.length > 0) {
      throw new DubApiError({
        code: "bad_request",
        message: `${pluralize("User", existingPartnerUsersEmails.length)} ${existingPartnerUsersEmails.join(", ")} already ${pluralize("exists", existingPartnerUsersEmails.length, { plural: "exist" })} in this partner profile.`,
      });
    }

    // Check for pending invites
    const existingInviteEmails = existingInvites.map(({ email }) => email);

    if (existingInviteEmails.length > 0) {
      throw new DubApiError({
        code: "conflict",
        message: `${pluralize("User", existingInviteEmails.length)} ${existingInviteEmails.join(", ")} ${pluralize("has", existingInviteEmails.length, { plural: "have" })} already been invited to this partner profile.`,
      });
    }

    if (invitesCount + partnerUsersCount + invites.length > MAX_PARTNER_USERS) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: `You can only have ${MAX_PARTNER_USERS} members in this partner profile.`,
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
  },
);

// DELETE /api/partner-profile/invites?email={email} - remove an invite
export const DELETE = withPartnerProfile(async ({ searchParams, partner }) => {
  const { email } = removeInviteSchema.parse(searchParams);

  await prisma.$transaction([
    prisma.partnerInvite.delete({
      where: {
        email_partnerId: {
          email,
          partnerId: partner.id,
        },
      },
    }),

    prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
      },
    }),
  ]);

  return NextResponse.json({ email });
});
