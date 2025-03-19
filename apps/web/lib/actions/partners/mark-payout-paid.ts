"use server";

import { getPayoutOrThrow } from "@/lib/api/partners/get-payout-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
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

    const [_program, payout] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),
      getPayoutOrThrow({
        payoutId,
        programId,
      }),
    ]);

    await prisma.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        status: "completed",
        paidAt: new Date(),
      },
    });
  });
