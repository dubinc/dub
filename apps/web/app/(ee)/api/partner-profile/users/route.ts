import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoPermission } from "@/lib/auth/partner-user-permissions";
import {
  getPartnerUsersQuerySchema,
  partnerUserSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/users - list of users
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { search, role } = getPartnerUsersQuerySchema.parse(searchParams);

  const users = await prisma.partnerUser.findMany({
    where: {
      partnerId: partner.id,
      role,
      ...(search && {
        OR: [
          {
            user: {
              name: {
                contains: search,
              },
            },
          },
          {
            user: {
              email: {
                contains: search,
              },
            },
          },
        ],
      }),
    },
    include: {
      user: true,
    },
  });

  const parsedUsers = users.map(({ user, ...rest }) =>
    partnerUserSchema.parse({
      ...rest,
      ...user,
      createdAt: rest.createdAt, // preserve the createdAt field from PartnerUser
    }),
  );

  return NextResponse.json(parsedUsers);
});

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(PartnerRole),
});

// PATCH /api/partner-profile/users - update a user's role
export const PATCH = withPartnerProfile(
  async ({ req, partner, session }) => {
    const { userId, role } = updateRoleSchema.parse(
      await parseRequestBody(req),
    );

    if (userId === session.user.id) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot change your own role.",
      });
    }

    // Wrap read and mutation in a transaction to prevent TOCTOU race conditions
    const response = await prisma.$transaction(async (tx) => {
      const [partnerUserFound, totalOwners] = await Promise.all([
        tx.partnerUser.findUnique({
          where: {
            userId_partnerId: {
              userId,
              partnerId: partner.id,
            },
          },
        }),

        tx.partnerUser.count({
          where: {
            partnerId: partner.id,
            role: "owner",
          },
        }),
      ]);

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

      return tx.partnerUser.update({
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
    });

    return NextResponse.json(response);
  },
  {
    requiredPermission: "users.update",
  },
);

const removeUserSchema = z.object({
  userId: z.string(),
});

// DELETE /api/partner-profile/users?userId={userId} - remove a user
export const DELETE = withPartnerProfile(
  async ({ searchParams, partner, partnerUser }) => {
    const { userId } = removeUserSchema.parse(searchParams);

    // Wrap read and mutation in a transaction to prevent TOCTOU race conditions
    const response = await prisma.$transaction(async (tx) => {
      const [userToRemove, totalOwners] = await Promise.all([
        tx.partnerUser.findUnique({
          where: {
            userId_partnerId: {
              userId,
              partnerId: partner.id,
            },
          },
        }),

        tx.partnerUser.count({
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

      return tx.partnerUser.delete({
        where: {
          id: userToRemove.id,
        },
      });
    });

    return NextResponse.json(response);
  },
);
