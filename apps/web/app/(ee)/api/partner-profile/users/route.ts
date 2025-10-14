import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoPermission } from "@/lib/auth/partner-user-permissions";
import { getPartnerUsersQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
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

  const [partnerUsers, partnerInvites] = await Promise.all([
    prisma.partnerUser.findMany({
      where: {
        partnerId: partner.id,
        ...(search && {
          OR: [
            { user: { email: { contains: search } } },
            { user: { name: { contains: search } } },
          ],
        }),
        ...(role && { role }),
      },
      include: {
        user: true,
      },
      orderBy:
        sortBy === "name" ? { user: { name: sortOrder } } : { role: sortOrder },
    }),

    prisma.partnerInvite.findMany({
      where: {
        partnerId: partner.id,
        ...(search && {
          email: { contains: search },
        }),
        ...(role && { role }),
      },
      orderBy: {
        [sortBy === "name" ? "email" : "role"]: sortOrder,
      },
    }),
  ]);

  const response = partnerUserSchema.parse([
    ...partnerUsers.map(({ user, role }) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      email: user.email,
      role,
      createdAt: user.createdAt,
    })),

    ...partnerInvites.map(({ email, createdAt, role }) => ({
      id: null,
      name: null,
      image: null,
      email,
      role,
      createdAt,
    })),
  ]);

  return NextResponse.json(response);
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
      permission: "user.update",
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

// DELETE /api/partner-profile/users?email={email} - remove an invite
export const DELETE = withPartnerProfile(async ({ searchParams, partner }) => {
  const { userId } = removeUserSchema.parse(searchParams);

  const [partnerUser, totalOwners] = await Promise.all([
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

  if (!partnerUser) {
    throw new DubApiError({
      code: "not_found",
      message: "The user you're trying to remove was not found.",
    });
  }

  if (totalOwners === 1 && partnerUser.role === "owner") {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Cannot remove the last owner from partner profile. Please assign another owner first.",
    });
  }

  const response = await prisma.partnerUser.delete({
    where: {
      id: partnerUser.id,
    },
  });

  return NextResponse.json(response);
});
