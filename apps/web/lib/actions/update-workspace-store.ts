"use server";

import { prisma } from "@dub/prisma";
import z from "../zod";
import { workspaceStoreKeys } from "../zod/schemas/workspaces";
import { authActionClient } from "./safe-action";

const updateWorkspaceStoreSchema = z.object({
  workspaceId: z.string(),
  key: workspaceStoreKeys,
  value: z.any().refine((val) => {
    const valueStr = JSON.stringify(val);
    const sizeInBytes = new TextEncoder().encode(valueStr).length;
    return sizeInBytes <= 1_097_152; // 1 MB in bytes
  }, "Value size must not exceed 1 MB"),
});

// Update a workspace store item
export const updateWorkspaceStore = authActionClient
  .schema(updateWorkspaceStoreSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { key, value } = parsedInput;

    const store = workspace.store;

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        store: {
          ...(store as Record<string, any>),
          [key]: value,
        },
      },
    });
  });
