"use server";

import { z } from "zod";
import { createProgramSchema } from "../zod/schemas/programs";
import { authActionClient } from "./safe-action";

const schema = createProgramSchema.extend({ workspaceId: z.string() });

// TODO:
// Generate the slug from the name
// Create the program in the DB

export const createProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      name,
      type,
      commissionType,
      commissionAmount,
      recurringCommission,
      minimumPayout,
      recurringDuration,
      isLifetimeRecurring,
    } = parsedInput;
  });
