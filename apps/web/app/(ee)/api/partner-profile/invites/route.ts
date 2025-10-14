import { DubApiError } from "@/lib/api/errors";
import { invitePartnerUser } from "@/lib/api/partners/invite-partner-user";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoPermission } from "@/lib/auth/partner-user-permissions";
import {
  MAX_INVITES_PER_REQUEST,
  MAX_PARTNER_USERS,
} from "@/lib/partners/constants";
import {
  getPartnerUsersQuerySchema,
  invitePartnerMemberSchema,
  partnerUserSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
import { isRejected, pluralize } from "@dub/utils";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/partner-profile/invites - get all invites for a partner profile
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { search, role, sortBy, sortOrder } =
    getPartnerUsersQuerySchema.parse(searchParams);

  const invites = await prisma.partnerInvite.findMany({
    where: {
      partnerId: partner.id,
      role,
      ...(search && {
        email: { contains: search },
      }),
    },
    orderBy: sortBy === "role" ? { role: sortOrder } : { email: sortOrder },
  });

  const parsedInvites = invites.map((invite) =>
    partnerUserSchema.parse({
      ...invite,
      id: null,
      name: invite.email,
    }),
  );

  return NextResponse.json(parsedInvites);
});

// POST /api/partner-profile/invites - invite team members
export const POST = withPartnerProfile(
  async ({ partner, req, session, partnerUser }) => {
    const invites = z
      .array(invitePartnerMemberSchema)
      .parse(await parseRequestBody(req));

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "user_invites.create",
    });

    if (invites.length > MAX_INVITES_PER_REQUEST) {
      throw new DubApiError({
        code: "bad_request",
        message: "You can only invite up to 5 members at a time.",
      });
    }

    const emails = Array.from(new Set([...invites.map(({ email }) => email)]));

    const [
      partnerInvitesCount,
      partnerUsersCount,
      existingPartnerUsers,
      existingPartnerInvites,
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
        message: `${pluralize("User", existingPartnerUsersEmails.length)} ${existingPartnerUsersEmails.join(", ")} already ${existingPartnerUsersEmails.length > 1 ? "have" : "has"} associated partner profiles.`,
      });
    }

    // Check for pending invites
    const existingInviteEmails = existingPartnerInvites.map(
      ({ email }) => email,
    );

    if (existingInviteEmails.length > 0) {
      throw new DubApiError({
        code: "conflict",
        message: `${pluralize("User", existingInviteEmails.length)} ${existingInviteEmails.join(", ")} ${pluralize("has", existingInviteEmails.length, { plural: "have" })} already been invited to this partner profile.`,
      });
    }

    if (
      partnerInvitesCount + partnerUsersCount + invites.length >
      MAX_PARTNER_USERS
    ) {
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

const updateInviteRoleSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(PartnerRole),
});

// PATCH /api/partner-profile/invites - update an invite's role
export const PATCH = withPartnerProfile(
  async ({ req, partner, partnerUser }) => {
    const { email, role } = updateInviteRoleSchema.parse(
      await parseRequestBody(req),
    );

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "user_invites.update",
    });

    const invite = await prisma.partnerInvite.findUnique({
      where: {
        email_partnerId: {
          email,
          partnerId: partner.id,
        },
      },
    });

    if (!invite) {
      throw new DubApiError({
        code: "not_found",
        message: "The invitation you're trying to update was not found.",
      });
    }

    const response = await prisma.partnerInvite.update({
      where: {
        email_partnerId: {
          email,
          partnerId: partner.id,
        },
      },
      data: {
        role,
      },
    });

    return NextResponse.json(response);
  },
);

const removeInviteSchema = z.object({
  email: z.string().email(),
});

// DELETE /api/partner-profile/invites?email={email} - remove an invite
export const DELETE = withPartnerProfile(
  async ({ searchParams, partner, partnerUser }) => {
    const { email } = removeInviteSchema.parse(searchParams);

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "user_invites.delete",
    });

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
  },
);
