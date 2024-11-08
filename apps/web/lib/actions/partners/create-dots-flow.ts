"use server";

import { getPartnerOrThrow } from "@/lib/api/partners/get-partner-or-throw";
import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import { redis } from "@/lib/upstash";
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
      const response = await createDotsFlow({
        steps: ["manage-payouts"],
        dotsUserId: partner.dotsUserId,
      });
      console.log({ response });

      await redis.set(`dots-flow-cache:${partner.id}`, response.id);

      return {
        ok: true,
        ...response,
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  });
