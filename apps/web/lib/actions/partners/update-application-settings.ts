"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { Category, prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  description: z.string().optional(),
  categories: z.array(z.nativeEnum(Category)).optional(),
});

export const updateApplicationSettingsAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { description, categories } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        ...(description && { description }),
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
