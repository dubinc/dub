"use server";

import { sendVerificationToken } from "@/lib/dots/send-verification-token";
import z from "@/lib/zod";
import { authPartnerActionClient } from "../safe-action";

// Resend verification code
export const resendVerificationCodeAction = authPartnerActionClient
  .schema(z.object({ partnerId: z.string() }))
  .action(async ({ ctx }) => {
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
  });
