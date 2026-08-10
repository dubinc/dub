import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import { VERIFICATION_TOKEN_CONFIG } from "@/lib/better-auth/constants";
import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";

type EmailChangeValue = z.infer<
  (typeof VERIFICATION_TOKEN_CONFIG)["emailChange"]["valueSchema"]
>;

export async function assertCanConfirmEmailChange({
  userId,
  data,
}: {
  userId: string;
  data: EmailChangeValue;
}) {
  if (data.ownerId.startsWith("pn_")) {
    const partnerUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId: data.ownerId,
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
      throw new Error("Invalid token.");
    }
  } else if (data.ownerId !== userId) {
    throw new Error("Invalid token");
  }

  if (data.syncIdentity) {
    if (!data.partnerId) {
      throw new Error("Invalid token.");
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
      throw new Error("Unauthorized.");
    }
  }
}
