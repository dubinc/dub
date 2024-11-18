"use server";

import { prisma } from "@/lib/prisma";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";
import { createProgramSchema } from "../zod/schemas/programs";
import { authActionClient } from "./safe-action";

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
      recurringDuration,
      recurringInterval,
      isLifetimeRecurring,
      cookieLength,
      domain,
    } = parsedInput;

    if (domain) {
      await prisma.domain.findUniqueOrThrow({
        where: {
          slug: domain,
          projectId: workspace.id,
        },
      });
    }

    const program = await prisma.program.create({
      data: {
        workspaceId: workspace.id,
        name,
        slug: slugify(name),
        commissionType,
        commissionAmount,
        recurringCommission,
        recurringDuration,
        recurringInterval,
        isLifetimeRecurring,
        cookieLength,
        domain,
      },
    });

    return program;
  });
