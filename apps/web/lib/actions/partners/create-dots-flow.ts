"use server";

import { getPartnerOrThrow } from "@/lib/api/partners/get-partner-or-throw";
import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import { userIsInBeta } from "@/lib/edge-config";
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

    const partnersPortalEnabled = await userIsInBeta(
      user.email,
      "partnersPortal",
    );
    if (!partnersPortalEnabled) {
      return {
        ok: false,
        error: "Partners portal feature flag disabled.",
      };
    }

    try {
      // TODO: [dots] probably need to specify the dots app ID if it ends up being different for each program enrollment
      const response = await createDotsFlow({
        partner,
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
