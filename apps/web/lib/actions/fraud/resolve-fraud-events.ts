"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { resolveFraudEventsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { authActionClient } from "../safe-action";

// Resolve a fraud event
export const resolveFraudEventsAction = authActionClient
  .schema(resolveFraudEventsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    let { fraudEventIds, resolutionReason } = parsedInput;

    const { canResolveFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canResolveFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        id: {
          in: fraudEventIds,
        },
        programId,
        status: "pending",
      },
      select: {
        id: true,
      },
    });

    if (fraudEvents.length === 0) {
      throw new Error("No pending fraud events found to resolve.");
    }

    fraudEventIds = fraudEvents.map(({ id }) => id);

    await prisma.fraudEvent.updateMany({
      where: {
        id: {
          in: fraudEventIds,
        },
      },
      data: {
        status: "resolved",
        resolutionReason,
        resolvedAt: new Date(),
        userId: user.id,
        resolutionBatchId: nanoid(16),
      },
    });
  });
