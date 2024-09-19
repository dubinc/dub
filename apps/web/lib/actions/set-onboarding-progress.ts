"use server";

import { z } from "zod";
import { ONBOARDING_STEPS } from "../onboarding/types";
import { redis } from "../upstash";
import { authUserActionClient } from "./safe-action";

// Generate a new client secret for an integration
export const setOnboardingProgress = authUserActionClient
  .schema(
    z.object({
      onboardingStep: z.enum(ONBOARDING_STEPS).nullable(),
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { onboardingStep } = parsedInput;

    try {
      await redis.set(`onboarding-step:${ctx.user.id}`, onboardingStep);
    } catch (e) {
      console.error("Failed to update onboarding step", e);
      throw new Error("Failed to update onboarding step");
    }

    return { success: true };
  });
