"use server";

import { DubApiError } from "@/lib/api/errors";
import { getPayoutOrThrow } from "@/lib/api/partners/get-payout-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const markPayoutPaidSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  payoutId: z.string(),
});

export const markPayoutPaidAction = authActionClient
  .schema(markPayoutPaidSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, payoutId } = parsedInput;

    if (programId !== workspace.defaultProgramId) {
      throw new DubApiError({
        code: "not_found",
        message: "Program not found",
      });
    }

    const payout = await getPayoutOrThrow({
      payoutId,
      programId,
    });

    await Promise.all([
      prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          status: "completed",
          paidAt: new Date(),
        },
      }),
      prisma.commission.updateMany({
        where: {
          payoutId: payout.id,
        },
        data: {
          status: "paid",
        },
      }),
    ]);
  });
