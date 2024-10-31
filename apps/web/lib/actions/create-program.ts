"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createProgramSchema } from "../zod/schemas/programs";
import { authActionClient } from "./safe-action";
import slugify from "@sindresorhus/slugify";

const schema = createProgramSchema.extend({ workspaceId: z.string() });

export const createProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      name,
      commissionType,
      commissionAmount,
      recurringCommission,
      minimumPayout,
      recurringDuration,
      recurringInterval,
      isLifetimeRecurring,
    } = parsedInput;

    const program = await prisma.program.create({
      data: {
        workspaceId: workspace.id,
        name,
        slug: slugify(name),
        commissionType,
        commissionAmount,
        recurringCommission,
        minimumPayout,
        recurringDuration,
        recurringInterval,
        isLifetimeRecurring,
      },
    });

    return program;
  });
