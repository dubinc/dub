"use server";

import { createVeriffSession } from "@/lib/veriff";
import { authPartnerActionClient } from "../safe-action";

export const startIdentityVerificationAction =
  authPartnerActionClient.action(async ({ ctx }) => {
    const { partner } = ctx;

    if (partner.identityVerificationStatus === "approved") {
      throw new Error("Your identity has already been verified.");
    }

    const { sessionUrl } = await createVeriffSession({ partner });

    return { sessionUrl };
  });
