import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoPermission } from "@/lib/auth/partner-user-permissions";
import { getPartnerUsersQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const partnerUserSchema = z.array(
  z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    email: z.string(),
    role: z.nativeEnum(PartnerRole),
    image: z.string().nullable(),
    createdAt: z.date(),
  }),
);

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(PartnerRole),
});

const removeUserSchema = z.object({
  userId: z.string(),
});

// GET /api/partner-profile/users - list of users + invites
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { search, role, sortBy, sortOrder } =
    getPartnerUsersQuerySchema.parse(searchParams);

  // Build WHERE conditions
  const searchCondition = search
    ? Prisma.sql`AND (u.email LIKE ${`%${search}%`} OR u.name LIKE ${`%${search}%`})`
    : Prisma.empty;

  const searchConditionInvites = search
    ? Prisma.sql`AND pi.email LIKE ${`%${search}%`}`
    : Prisma.empty;

  const roleCondition = role ? Prisma.sql`AND pu.role = ${role}` : Prisma.empty;

  const roleConditionInvites = role
    ? Prisma.sql`AND pi.role = ${role}`
    : Prisma.empty;

  const sortColumn = sortBy === "name" ? "sort_name" : "role";
  const sortDirection = sortOrder === "desc" ? "DESC" : "ASC";

  const results = await prisma.$queryRaw(Prisma.sql`
    SELECT 
      u.id,
      u.name,
      u.email,
      pu.role,
      u.image,
      pu.createdAt,
      COALESCE(u.name, u.email) as sort_name
    FROM PartnerUser pu
    INNER JOIN User u ON pu.userId = u.id
    WHERE pu.partnerId = ${partner.id}
      ${searchCondition}
      ${roleCondition}

    UNION ALL

    SELECT 
      NULL as id,
      NULL as name,
      pi.email,
      pi.role,
      NULL as image,
      pi.createdAt,
      pi.email as sort_name
    FROM PartnerInvite pi
    WHERE pi.partnerId = ${partner.id}
      ${searchConditionInvites}
      ${roleConditionInvites}

    ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(sortDirection)}, createdAt ASC, email ASC
  `);

  return NextResponse.json(partnerUserSchema.parse(results));
});

// PATCH /api/partner-profile/users - update a user's role
export const PATCH = withPartnerProfile(
  async ({ req, partner, partnerUser, session }) => {
    const { userId, role } = updateRoleSchema.parse(
      await parseRequestBody(req),
    );

    if (userId === session.user.id) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot change your own role.",
      });
    }

    const [partnerUserFound, totalOwners] = await Promise.all([
      prisma.partnerUser.findUnique({
        where: {
          userId_partnerId: {
            userId,
            partnerId: partner.id,
          },
        },
      }),

      prisma.partnerUser.count({
        where: {
          partnerId: partner.id,
          role: "owner",
        },
      }),
    ]);

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "users.update",
    });

    if (!partnerUserFound) {
      throw new DubApiError({
        code: "not_found",
        message: "The user you're trying to update was not found.",
      });
    }

    if (
      totalOwners === 1 &&
      partnerUserFound.role === "owner" &&
      role !== "owner"
    ) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Cannot change the role of the last owner. Please assign another owner first.",
      });
    }

    const response = await prisma.partnerUser.update({
      where: {
        userId_partnerId: {
          userId,
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

// DELETE /api/partner-profile/users?userId={userId} - remove a user
export const DELETE = withPartnerProfile(
  async ({ searchParams, partner, partnerUser }) => {
    const { userId } = removeUserSchema.parse(searchParams);

    const [userToRemove, totalOwners] = await Promise.all([
      prisma.partnerUser.findUnique({
        where: {
          userId_partnerId: {
            userId,
            partnerId: partner.id,
          },
        },
      }),

      prisma.partnerUser.count({
        where: {
          partnerId: partner.id,
          role: "owner",
        },
      }),
    ]);

    if (!userToRemove) {
      throw new DubApiError({
        code: "not_found",
        message:
          "The user you're trying to remove was not found in this partner profile.",
      });
    }

    const isSelfRemoval = userToRemove.userId === partnerUser.userId;

    if (!isSelfRemoval) {
      throwIfNoPermission({
        role: partnerUser.role,
        permission: "users.delete",
      });
    }

    if (totalOwners === 1 && userToRemove.role === "owner") {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You can't remove the only owner from this partner profile. Please assign another owner before removing this one.",
      });
    }

    const response = await prisma.partnerUser.delete({
      where: {
        id: userToRemove.id,
      },
    });

    return NextResponse.json(response);
  },
);
