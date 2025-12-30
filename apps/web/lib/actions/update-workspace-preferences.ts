"use server";

import { prisma } from "@dub/prisma";
import z from "../zod";
import { workspacePreferencesValueSchemas } from "../zod/schemas/workspace-preferences";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  key: z.string(),
  value: z.any(),
});

// Update a user's preferences for a workspace
export const updateWorkspacePreferences = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { key, value } = parsedInput;

    const valueSchema = workspacePreferencesValueSchemas[key];

    if (!valueSchema)
      throw new Error(`Invalid workspace preference key: ${key}`);

    const parsedValue = valueSchema.parse(value);

    const workspacePreferences =
      (workspace.users[0].workspacePreferences as
        | Record<string, any>
        | undefined
        | null) ?? {};

    await prisma.projectUsers.update({
      where: {
        userId_projectId: {
          userId: ctx.user.id,
          projectId: workspace.id,
        },
      },
      data: {
        workspacePreferences: {
          ...workspacePreferences,
          [key]: parsedValue,
        },
      },
    });

    return { ok: true };
  });
