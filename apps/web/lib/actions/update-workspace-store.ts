"use server";

import { prisma } from "@dub/prisma";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  key: z.string(),
  value: z.any(),
});

// TODO:
// Add validation for key and value, otherwise it is open to abuse

// Update a workspace store item
export const updateWorkspaceStore = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { key, value } = parsedInput;

    const store =
      (workspace.store as Record<string, any> | undefined | null) ?? {};

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        store: {
          ...store,
          [key]: value,
        },
      },
    });

    return { ok: true };
  });
