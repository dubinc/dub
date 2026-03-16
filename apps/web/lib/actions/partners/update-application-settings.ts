"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { applicationRequirementsSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { Category } from "@dub/prisma/client";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  description: z.string().optional(),
  categories: z.array(z.enum(Category)).optional(),
  eligibilityConditions: applicationRequirementsSchema.optional(),
});

export const updateApplicationSettingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { description, categories, eligibilityConditions } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        ...(description !== undefined && { description }),
        ...(categories && {
          categories: {
            deleteMany: {},
            create: categories.map((category) => ({ category })),
          },
        }),
        ...(eligibilityConditions !== undefined && {
          applicationRequirements: eligibilityConditions,
        }),
      },
    });

    return program;
  });
