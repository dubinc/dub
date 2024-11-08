"use server";

import { z } from "zod";
import { createOrgTransfer } from "../dots/create-org-transfer";
import { createTransfer } from "../dots/create-transfer";
import { authActionClient } from "./safe-action";

const schema = z.object({
  dotsUserId: z.string(),
  amount: z.number(),
  workspaceId: z.string(),
});

export const createDotsTransferAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { dotsUserId, amount } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Dots app not found");
    }

    const res = await Promise.all([
      createTransfer({
        amount,
        dotsAppId: workspace.dotsAppId,
        dotsUserId,
      }),
      // each transfer incurs a fee of $1 + 2% with a cap of $20 (2000 cents)
      createOrgTransfer({
        amount: Math.min(amount * 0.02 + 100, 2000),
        dotsAppId: workspace.dotsAppId,
      }),
    ]);
    console.log("res", res);

    return res;
  });
