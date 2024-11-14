"use server";

import { z } from "zod";
import { depositFunds } from "../dots/deposit-funds";
import { depositFundsSchema } from "../dots/schemas";
import { authActionClient } from "./safe-action";

const schema = depositFundsSchema.extend({
  workspaceId: z.string(),
});

export const depositFundsAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { amount } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Dots app ID is not set for this workspace.");
    }

    return await depositFunds({
      dotsAppId: workspace.dotsAppId,
      amount,
    });
  });
