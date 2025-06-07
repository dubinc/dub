"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const createManualPayoutAction = authActionClient
  .schema(createManualPayoutSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId, amount, description } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
    });

    const amountInCents = amount || 0;

    const payout = await prisma.payout.create({
      data: {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount: amountInCents,
        description,
      },
    });

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    return payout;
  });
