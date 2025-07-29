"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { FRAUD_EVENT_BAN_REASONS } from "@/lib/zod/schemas/fraud-events";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string().trim().min(1),
  fraudEventId: z.string().trim().min(1),
  reason: z
    .enum(Object.keys(FRAUD_EVENT_BAN_REASONS) as [string, ...string[]])
    .optional(),
  notifyPartner: z.boolean().default(false),
});

export const markFraudEventBannedAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { fraudEventId, reason, notifyPartner } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvent = await prisma.fraudEvent.findUniqueOrThrow({
      where: {
        id: fraudEventId,
      },
    });

    if (fraudEvent.programId !== programId) {
      throw new Error(`Fraud event ${fraudEventId} not found.`);
    }

    if (fraudEvent.status !== "pending") {
      throw new Error(
        `Fraud event ${fraudEventId} is already marked as ${fraudEvent.status}.`,
      );
    }

    await prisma.fraudEvent.update({
      where: {
        id: fraudEventId,
      },
      data: {
        status: "banned",
        userId: user.id,
        description: reason,
      },
    });

    // TODO:
    // Send email
    // Ban the partner

    if (notifyPartner) {
      //
    }
  });
