"use server";

import { resolveFraudEvents } from "@/lib/api/fraud/resolve-fraud-events";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { resolveFraudEventsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const resolveFraudEventsAction = authActionClient
  .schema(resolveFraudEventsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { groupKey, resolutionReason } = parsedInput;

    const { canManageFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canManageFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const resolvedFraudEvents = await resolveFraudEvents({
      where: {
        programId,
        groupKey,
      },
      userId: user.id,
      ...(resolutionReason && { resolutionReason }),
    });

    // Add the resolution reason as a comment to the partner
    if (
      resolutionReason &&
      resolvedFraudEvents &&
      resolvedFraudEvents.length > 0
    ) {
      await prisma.partnerComment.create({
        data: {
          programId,
          partnerId: resolvedFraudEvents[0].partnerId,
          userId: user.id,
          text: resolutionReason,
        },
      });
    }
  });
