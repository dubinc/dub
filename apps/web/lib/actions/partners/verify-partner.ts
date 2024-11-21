"use server";

import { verifyUserWithToken } from "@/lib/dots/verify-user-with-token";
import z from "@/lib/zod";
import { authPartnerActionClient } from "../safe-action";

// Verify partner phone number
export const verifyPartnerAction = authPartnerActionClient
  .schema(z.object({ partnerId: z.string(), code: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { code } = parsedInput;

    if (!partner.dotsUserId) {
      throw new Error("Partner does not have a Dots user ID.");
    }

    try {
      await verifyUserWithToken({
        dotsUserId: partner.dotsUserId,
        token: code,
      });
    } catch (error) {
      throw new Error("Invalid code. Please try again.");
    }

    return {
      partnerId: partner.id,
    };
  });
