"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createOrgTransfer } from "../../dots/create-org-transfer";
import { createTransfer } from "../../dots/create-transfer";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  dotsUserId: z.string(),
  payoutId: z.string(),
});

export const createDotsTransferAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { dotsUserId, payoutId } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Dots app not found for workspace");
    }

    const payout = await prisma.payout.findUniqueOrThrow({
      where: { id: payoutId },
    });

    const [transfer, orgTransfer] = await Promise.all([
      createTransfer({
        amount: payout.amount,
        dotsAppId: workspace.dotsAppId,
        dotsUserId,
      }),
      createOrgTransfer({
        amount: payout.fee,
        dotsAppId: workspace.dotsAppId,
      }),
    ]);

    await prisma.payout.update({
      where: { id: payoutId },
      data: { dotsTransferId: transfer.id, status: "completed" },
    });

    return { transfer, orgTransfer };
  });
