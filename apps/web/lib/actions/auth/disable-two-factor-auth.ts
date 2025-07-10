"use server";

import { sendEmail } from "@dub/email";
import TwoFactorDisabled from "@dub/email/templates/two-factor-disabled";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
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

    waitUntil(
      sendEmail({
        subject: "Two Factor authentication disabled",
        email: user.email,
        react: TwoFactorDisabled({ email: user.email }),
        variant: "notifications",
      }),
    );
  },
);
