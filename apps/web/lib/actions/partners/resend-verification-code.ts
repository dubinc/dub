"use server";

import { sendVerificationToken } from "@/lib/dots/send-verification-token";
import { authPartnerActionClient } from "../safe-action";

// Resend verification code
export const resendVerificationCodeAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (!partner.dotsUserId) {
      throw new Error("Partner does not have a Dots user ID");
    }

    await sendVerificationToken({
      dotsUserId: partner.dotsUserId,
    });

    return {
      success: true,
    };
  },
);
