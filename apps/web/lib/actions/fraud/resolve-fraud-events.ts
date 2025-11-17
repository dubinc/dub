"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";

const resolveFraudEventSchema = z.object({
  type: z.nativeEnum(FraudRuleType),
  partnerId: z.string(),
  workspaceId: z.string(),
  resolutionReason: z
    .string()
    .max(1000, "Reason must be less than 1000 characters")
    .optional(),
});

// Resolve fraud events
export const resolveFraudEventAction = authActionClient
  .schema(resolveFraudEventSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { type, partnerId, resolutionReason } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    // Check if the workspace has the capability to resolve fraud events
    const { canResolveFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canResolveFraudEvents) {
      throw new Error("Unauthorized.");
    }

    await prisma.fraudEvent.updateMany({
      where: {
        programId,
        partnerId,
        type,
      },
      data: {
        status: "resolved",
        resolutionReason,
        resolvedAt: new Date(),
        userId: user.id,
      },
    });

    // Add a comment for the partner if resolutionReason is provided
    if (resolutionReason) {
      await prisma.partnerComment.create({
        data: {
          programId,
          partnerId,
          userId: user.id,
          text: resolutionReason,
        },
      });
    }
  });
