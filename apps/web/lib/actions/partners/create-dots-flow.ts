"use server";

import { getPartnerOrThrow } from "@/lib/api/partners/get-partner-or-throw";
import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import { dotsFlowStepsSchema } from "@/lib/dots/schemas";
import { redis } from "@/lib/upstash";
import z from "../../zod";
import { authUserActionClient } from "../safe-action";

export const createDotsFlowSchema = z.object({
  partnerId: z.string(),
  flow: dotsFlowStepsSchema,
});

// Create a Dots flow for connecting payout methods
export const createDotsFlowAction = authUserActionClient
  .schema(createDotsFlowSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { partnerId, flow } = parsedInput;
    if (!partnerId || !flow) {
      throw new Error("Missing partnerId or flow");
    }

    const { partner } = await getPartnerOrThrow({
      partnerId,
      userId: user.id,
    });

    try {
      const response = await createDotsFlow({
        steps: [flow],
        dotsUserId: partner.dotsUserId,
      });

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
