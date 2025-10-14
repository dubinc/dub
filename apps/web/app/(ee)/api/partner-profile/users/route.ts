import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.array(
  z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    email: z.string(),
    role: z.nativeEnum(PartnerRole),
    image: z.string().nullable(),
  }),
);

// GET /api/partner-profile/users - list of users + invites
export const GET = withPartnerProfile(async ({ partner }) => {
  const [partnerUsers, partnerInvites] = await Promise.all([
    prisma.partnerUser.findMany({
      where: {
        partnerId: partner.id,
      },
      include: {
        user: true,
      },
    }),

    prisma.partnerInvite.findMany({
      where: {
        partnerId: partner.id,
      },
    }),
  ]);

  console.log(partnerUsers);

  const response = schema.parse([
    ...partnerUsers.map(({ user, role }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role,
    })),

    ...partnerInvites.map(({ email, role }) => ({
      id: null,
      name: null,
      email,
      role,
    })),
  ]);

  return NextResponse.json(response);
});
