"use server";

import { getFraudEventOrThrow } from "@/lib/api/fraud/get-fraud-event-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  fraudEventSchema,
  resolveFraudEventSchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus } from "@dub/prisma/client";
import z from "@/lib/zod";
import { authActionClient } from "../safe-action";

const resolveFraudEventActionSchema = z.object({
  fraudEventId: z.string(),
  workspaceId: z.string(),
  resolutionReason: resolveFraudEventSchema.shape.resolutionReason,
});

// Resolve a fraud event
export const resolveFraudEventAction = authActionClient
  .schema(resolveFraudEventActionSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { fraudEventId, resolutionReason } = parsedInput;

    // Check plan requirements
    if (!["advanced", "enterprise"].includes(workspace.plan)) {
      throw new Error("Unauthorized: Need higher plan.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvent = await getFraudEventOrThrow({
      fraudEventId,
      programId,
    });

    if (fraudEvent.status !== FraudEventStatus.pending) {
      throw new Error("This fraud event has already been resolved.");
    }

    const updatedFraudEvent = await prisma.fraudEvent.update({
      where: {
        id: fraudEventId,
      },
      data: {
        status: "resolved",
        resolutionReason,
        resolvedAt: new Date(),
        userId: user.id,
      },
      include: {
        user: true,
        partner: true,
        commission: true,
      },
    });

    return fraudEventSchema.parse(updatedFraudEvent);
  });

