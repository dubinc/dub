"use server";

import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import { dotsFlowStepsSchema } from "@/lib/dots/schemas";
import { redis } from "@/lib/upstash";
import z from "../../zod";
import { authPartnerActionClient } from "../safe-action";

const createDotsFlowSchema = z.object({
  partnerId: z.string(),
  flow: dotsFlowStepsSchema,
});

// Create a Dots flow for connecting payout methods
export const createDotsFlowAction = authPartnerActionClient
  .schema(createDotsFlowSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { flow } = parsedInput;

    if (!flow) {
      throw new Error("Missing flow parameter");
    }

    const response = await createDotsFlow({
      step: flow,
      dotsUserId: partner.dotsUserId,
    });

    await redis.set(`dots-flow-cache:${partner.id}`, response.id);

    return response;
  });
