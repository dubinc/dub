"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  // payoutIds: z.array(z.string()),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    // TODO:
    // Find the pending payouts for the program
    // Create a new invoice
    // Update the payouts with the invoice id
    // Start a Qstash workflow
    // Return the invoice id
  });
