"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { Category } from "@dub/prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  marketplaceEnabled: z.boolean().optional(),
  categories: z.array(z.nativeEnum(Category)).optional(),
});

export const updateApplicationSettingsAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { marketplaceEnabled, categories } = parsedInput;

    if (marketplaceEnabled && !categories?.length)
      throw new Error("Categories are required when marketplace is enabled");

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        ...(marketplaceEnabled !== undefined && {
          addedToMarketplaceAt: marketplaceEnabled ? new Date() : null,
        }),
        ...(categories && {
          categories: {
            deleteMany: {},
            create: categories.map((category) => ({ category })),
          },
        }),
      },
    });

    return program;
  });
