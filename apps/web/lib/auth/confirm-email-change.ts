import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { VerificationToken } from "@prisma/client";
import { hashToken } from "./hash-token";
import { hasPermission } from "./partner-users/partner-user-permissions";

export type EmailChangeRequestData = {
  email: string;
  newEmail: string;
  isPartnerProfile?: boolean;
  syncIdentity?: boolean;
  partnerId?: string;
  redirectTo?: "/profile" | "/account/settings";
};

export async function deleteEmailChangeRequest(token: string) {
  const hashedToken = await hashToken(token, { secret: true });

  try {
    await Promise.allSettled([
      prisma.verificationToken.delete({
        where: {
          token: hashedToken,
        },
      }),

      redis.del(`email-change-request:token:${hashedToken}`),
    ]);
  } catch {}
}

export async function assertCanConfirmEmailChange({
  userId,
  tokenFound,
  data,
}: {
  userId: string;
  tokenFound: Pick<VerificationToken, "identifier">;
  data: EmailChangeRequestData;
}) {
  if (tokenFound.identifier.startsWith("pn_")) {
    const partnerUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId: tokenFound.identifier,
        },
      },
      select: {
        role: true,
      },
    });

    if (
      !partnerUser ||
      !hasPermission(partnerUser.role, "partner_profile.update")
    ) {
      throw new Error("This token is invalid. Please request a new one.");
    }
  } else if (tokenFound.identifier !== userId) {
    throw new Error("This token is invalid. Please request a new one.");
  }

  if (data.syncIdentity) {
    if (!data.partnerId) {
      throw new Error("This token is invalid. Please request a new one.");
    }

    const partnerUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId: data.partnerId,
        },
      },
      select: {
        role: true,
      },
    });

    if (
      !partnerUser ||
      !hasPermission(partnerUser.role, "partner_profile.update")
    ) {
      throw new Error(
        "You don't have access to update the partner profile associated with this email change request.",
      );
    }
  }
}
