"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updateApplicationSettingsSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const updateApplicationSettingsAction = authActionClient
  .inputSchema(updateApplicationSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { description, categories, eligibilityConditions } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.program.update({
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
  });
