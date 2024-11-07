"use server";

import { getPartnerOrThrow } from "@/lib/api/partners/get-partner-or-throw";
import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

const onboardPartnerSchema = z.object({
  partnerId: z.string(),
});

// Create a Dots flow for connecting payout methods
export const createDotsFlowAction = authUserActionClient
  .schema(onboardPartnerSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;

    const { partner } = await getPartnerOrThrow({
      partnerId: parsedInput.partnerId,
      userId: user.id,
    });

    try {
      if (!partner.dotsUserId) {
        throw new Error("Partner does not have a Dots user ID");
      }

      const response = await createDotsFlow({
        dotsUserId: partner.dotsUserId,
        steps: ["manage-payouts"],
      });

      return { ok: true, ...response };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }
  });
