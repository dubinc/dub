import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
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
  }),
);

const removeUserSchema = z.object({
  userId: z.string(),
});

// GET /api/partner-profile/users - list of users + invites
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { search, sortBy, sortOrder } =
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
    })),

    ...partnerInvites.map(({ email, role }) => ({
      id: null,
      name: null,
      image: null,
      email,
      role,
    })),
  ]);

  return NextResponse.json(response);
});

// DELETE /api/partner-profile/users?email={email} - remove an invite
export const DELETE = withPartnerProfile(
  async ({ searchParams, partner, session }) => {
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

    if (
      (totalOwners === 1 && partnerUser.role === "owner",
      userId === session.user.id)
    ) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Cannot remove owner from partner profile. Please transfer ownership to another user first.",
      });
    }

    const response = await prisma.partnerUser.delete({
      where: {
        id: partnerUser.id,
      },
    });

    return NextResponse.json(response);
  },
);
