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
  paidAt: z.string().datetime().nullish(),
});

export const markPayoutPaidAction = authActionClient
  .schema(markPayoutPaidSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, payoutId, paidAt } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const payout = await getPayoutOrThrow({
      payoutId,
      programId,
    });

    await prisma.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        status: "completed",
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });
  });
