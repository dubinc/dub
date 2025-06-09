"use server";

import { getTOTPInstance } from "@/lib/auth/totp";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authUserActionClient } from "../safe-action";

const schema = z.object({
  token: z.string().length(6, "Code must be 6 digits"),
});

// Confirm 2FA for an user
export const confirmTwoFactorAuthAction = authUserActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { token } = parsedInput;
    const { user } = ctx;

    const currentUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
      select: {
        twoFactorSecret: true,
        twoFactorConfirmedAt: true,
      },
    });

    if (currentUser.twoFactorConfirmedAt) {
      throw new Error("2FA is already enabled for your account.");
    }

    if (!currentUser.twoFactorSecret) {
      throw new Error("No 2FA secret found. Please try enabling 2FA again.");
    }

    const totp = getTOTPInstance({
      secret: currentUser.twoFactorSecret,
      label: user.email,
    });

    const delta = totp.validate({
      token,
      window: 1,
    });

    console.log({
      delta,
    });

    // If delta is null, the token is invalid
    // If delta is a number, the token is valid (0 = current step, 1 = next step, -1 = previous step)
    if (delta === null) {
      throw new Error("Invalid 2FA code entered. Please try again.");
    }

    // Update the user's record to confirm 2FA is enabled
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorConfirmedAt: new Date(),
      },
    });
  });
