"use server";

import { prisma } from "@dub/prisma";
import { authUserActionClient } from "../safe-action";

// Disable 2FA for an user
export const disableTwoFactorAuthAction = authUserActionClient.action(
  async ({ ctx }) => {
    const { user } = ctx;

    const currentUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });

    if (!currentUser.twoFactorConfirmedAt) {
      throw new Error("2FA is not enabled for your account.");
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorSecret: null,
        twoFactorConfirmedAt: null,
        twoFactorRecoveryCodes: null,
      },
    });
  },
);
