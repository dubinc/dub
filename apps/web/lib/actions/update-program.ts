"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { getProgramOrThrow } from "../api/programs/get-program";
import { createProgramSchema } from "../zod/schemas/programs";
import { authActionClient } from "./safe-action";

const schema = createProgramSchema.partial().extend({
  workspaceId: z.string(),
  programId: z.string(),
});

export const updateProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      programId,
      name,
      commissionType,
      commissionAmount,
      recurringCommission,
      recurringDuration,
      recurringInterval,
      isLifetimeRecurring,
      cookieLength,
      domain,
      url,
    } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const program = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        name,
        commissionType,
        commissionAmount,
        recurringCommission,
        recurringDuration,
        recurringInterval,
        isLifetimeRecurring,
        cookieLength,
        domain,
        url,
      },
    });

    return program;
  });
