"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { FRAUD_EVENT_SAFE_REASONS } from "@/lib/zod/schemas/fraud-events";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string().trim().min(1),
  fraudEventId: z.string().trim().min(1),
  reason: z
    .enum(Object.keys(FRAUD_EVENT_SAFE_REASONS) as [string, ...string[]])
    .optional(),
});

export const markFraudEventSafeAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { fraudEventId, reason } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvent = await prisma.fraudEvent.findUniqueOrThrow({
      where: {
        id: fraudEventId,
      },
    });

    if (fraudEvent.programId !== programId) {
      throw new Error(`Fraud event ${fraudEventId} not found.`);
    }

    if (fraudEvent.status === "safe") {
      throw new Error(`Fraud event ${fraudEventId} is already marked as safe.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.fraudEvent.update({
        where: {
          id: fraudEventId,
        },
        data: {
          status: "safe",
          userId: user.id,
          description: reason,
        },
      });

      // "Marking them as Safe" should ignore future flags because you are making a decision on that partner
      await tx.programEnrollment.update({
        where: {
          partnerId_programId: {
            partnerId: fraudEvent.partnerId,
            programId,
          },
        },
        data: {
          ignoreFraudEventsEnabledAt: new Date(),
        },
      });
    });
  });
