"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createOrgTransfer } from "../dots/create-org-transfer";
import { createTransfer } from "../dots/create-transfer";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  dotsUserId: z.string(),
  payoutId: z.string(),
  amount: z.number(),
  fee: z.number(),
});

export const createDotsTransferAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { dotsUserId, payoutId, amount, fee } = parsedInput;

    console.log({ dotsUserId, amount, fee });

    if (!workspace.dotsAppId) {
      throw new Error("Dots app not found");
    }

    const [transfer, orgTransfer] = await Promise.all([
      createTransfer({
        amount,
        dotsAppId: workspace.dotsAppId,
        dotsUserId,
      }),
      // each transfer incurs a fee of $1 + 2% with a cap of $20 (2000 cents)
      createOrgTransfer({
        amount: fee,
        dotsAppId: workspace.dotsAppId,
      }),
    ]);

    prisma.payout.update({
      where: { id: payoutId },
      data: { dotsTransferId: transfer.id, status: "completed" },
    });

    return { transfer, orgTransfer };
  });
