"use server";

import { createFraudEventGroupKey } from "@/lib/api/fraud/utils";
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
    const { groupKey, resolutionReason } = parsedInput;

    const { canResolveFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canResolveFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        programId,
        groupKey,
        status: "pending",
      },
      select: {
        id: true,
        partnerId: true,
        type: true,
      },
    });

    if (fraudEvents.length === 0) {
      throw new Error("No pending fraud events found to resolve.");
    }

    const newGroupKey = createFraudEventGroupKey({
      programId,
      partnerId: fraudEvents[0].partnerId,
      type: fraudEvents[0].type,
      batchId: nanoid(10),
    });

    await prisma.fraudEvent.updateMany({
      where: {
        id: {
          in: fraudEvents.map(({ id }) => id),
        },
      },
      data: {
        status: "resolved",
        resolutionReason,
        resolvedAt: new Date(),
        userId: user.id,
        groupKey: newGroupKey,
      },
    });
  });
