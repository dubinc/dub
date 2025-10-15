import { Session, hashToken } from "@/lib/auth";
import { PartnerProps } from "@/lib/types";
import { sendEmail } from "@dub/email";
import PartnerUserInvited from "@dub/email/templates/partner-user-invited";
import { prisma } from "@dub/prisma";
import { PARTNERS_DOMAIN, TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { PartnerRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { DubApiError } from "../errors";

export async function invitePartnerUser({
  email,
  role,
  partner,
  session,
}: {
  email: string;
  role: PartnerRole;
  partner: Omit<PartnerProps, "role" | "userId">;
  session: Session;
}) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TWO_WEEKS_IN_SECONDS * 1000);

  try {
    await prisma.partnerInvite.create({
      data: {
        partnerId: partner.id,
        email,
        role,
        expires,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new DubApiError({
        code: "conflict",
        message: "User has already been invited to this partner profile.",
      });
    }
  }

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: await hashToken(token, { secret: true }),
      expires,
    },
  });

  const params = new URLSearchParams({
    callbackUrl: `${PARTNERS_DOMAIN}/invite`,
    email,
    token,
  });

  const url = `${PARTNERS_DOMAIN}/api/auth/callback/email?${params}`;

  return await sendEmail({
    subject: `You've been invited to join a partner profile on Dub Partners.`,
    to: email,
    react: PartnerUserInvited({
      email,
      url,
      partnerName: partner.name,
      partnerUser: session?.user.name || null,
      partnerUserEmail: session?.user.email || null,
    }),
  });
}
