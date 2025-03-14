"use server";

import { prisma } from "@dub/prisma";
import z from "../zod";
import { notificationTypes } from "../zod/schemas/workspaces";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  type: notificationTypes,
  value: z.boolean(),
});

// Update the notification preference for a user in a workspace
export const updateNotificationPreference = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { user, workspace } = ctx;
    const { type, value } = parsedInput;

    await prisma.projectUsers.update({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workspace.id,
        },
      },
      data: {
        notificationPreference: {
          update: {
            [type]: value,
          },
        },
      },
    });

    return { ok: true };
  });
