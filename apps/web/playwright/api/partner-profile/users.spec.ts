import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { randomName, randomPartnerEmail } from "../../utils";
import { createBearerApiClient, test } from "../fixtures";

async function createPartnerProfileAuth(
  partner: {
    id: string;
    email?: string | null;
  },
  { role = "owner" as const }: { role?: "owner" | "member" } = {},
) {
  const token = `dub_pw_${nanoid(24)}`;
  const user = await prisma.user.create({
    data: {
      id: createId({ prefix: "user_" }),
      email: role === "owner" ? partner.email : randomPartnerEmail(),
      emailVerified: new Date(),
      defaultPartnerId: partner.id,
      partners: {
        create: {
          partnerId: partner.id,
          role,
        },
      },
      tokens: {
        create: {
          name: "Playwright partner profile",
          hashedKey: await hashToken(token),
          partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
        },
      },
    },
  });

  return { token, userId: user.id };
}

test("DELETE /partner-profile/users - clears defaultPartnerId", async ({
  playwright,
}) => {
  let partnerId: string | undefined;
  let ownerId: string | undefined;
  let memberId: string | undefined;

  try {
    const partner = await prisma.partner.create({
      data: {
        id: createId({ prefix: "pn_" }),
        name: randomName("partner"),
        email: randomPartnerEmail(),
      },
    });
    partnerId = partner.id;

    const owner = await createPartnerProfileAuth(partner);
    ownerId = owner.userId;

    const member = await createPartnerProfileAuth(partner, { role: "member" });
    memberId = member.userId;

    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token: owner.token,
    });

    try {
      const { status, data } = await partnerApi.delete<{
        id: string;
        userId: string;
        partnerId: string;
        role: string;
      }>(`/api/partner-profile/users?userId=${member.userId}`);

      expect(status).toEqual(200);
      expect(data).toMatchObject({
        userId: member.userId,
        partnerId: partner.id,
        role: "member",
      });

      const [updatedMember, membership] = await Promise.all([
        prisma.user.findUnique({
          where: { id: member.userId },
          select: { defaultPartnerId: true },
        }),
        prisma.partnerUser.findUnique({
          where: {
            userId_partnerId: {
              userId: member.userId,
              partnerId: partner.id,
            },
          },
        }),
      ]);

      expect(updatedMember?.defaultPartnerId).toBeNull();
      expect(membership).toBeNull();
    } finally {
      await dispose();
    }
  } finally {
    if (ownerId) await prisma.user.delete({ where: { id: ownerId } });
    if (memberId) await prisma.user.delete({ where: { id: memberId } });
    if (partnerId) {
      await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
    }
  }
});
