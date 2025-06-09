"use server";

import { totpSecret } from "@/lib/auth/totp";
import { prisma } from "@dub/prisma";
import { authUserActionClient } from "../safe-action";

// Enable 2FA for an user
export const enableTwoFactorAuth = authUserActionClient.action(
  async ({ ctx }) => {
    const { user } = ctx;

    const currentUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });

    if (currentUser.twoFactorConfirmedAt) {
      throw new Error("2FA is already enabled for your account.");
    }

    // This doesn't enable the 2FA for the user, it just adds the secret to the user's account
    // the user needs to confirm the 2FA by entering the code from the app
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorSecret: totpSecret.base32,
      },
    });
  },
);
