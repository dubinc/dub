"use server";

import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { PayoutType } from "@prisma/client";
import { authActionClient } from "../safe-action";

const schema = createManualPayoutSchema;

export const createManualPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, amount, description } = parsedInput;

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        program: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    if (programEnrollment.program.workspaceId !== workspace.id) {
      throw new DubApiError({
        code: "not_found",
        message: "Program not found",
      });
    }

    const amountInCents = amount || 0;

    const payout = await prisma.payout.create({
      data: {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        type: PayoutType.custom,
        amount: amountInCents,
        description,
      },
    });

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    return payout;
  });
