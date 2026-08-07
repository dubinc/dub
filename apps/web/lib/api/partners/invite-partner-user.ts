import { Session } from "@/lib/auth";
import { buildLookupKey, buildMagicLinkUrl } from "@/lib/better-auth/utils";
import { createVerificationToken } from "@/lib/better-auth/verification-token";
import { prisma } from "@/lib/prisma";
import { PartnerProps } from "@/lib/types";
import { sendEmail } from "@dub/email";
import PartnerUserInvited from "@dub/email/templates/partner-user-invited";
import { PARTNERS_DOMAIN, TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { PartnerRole } from "@prisma/client";
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
  email = email.trim().toLowerCase();

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

  const { token } = await createVerificationToken({
    kind: "invite",
    value: {
      email,
      isInvite: true,
    },
    lookupKey: buildLookupKey("invite", email, partner.id),
    removePreviousTokens: true,
  });

  const url = buildMagicLinkUrl({
    token,
    origin: PARTNERS_DOMAIN,
    callbackURL: `${PARTNERS_DOMAIN}/invite`,
  });

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
