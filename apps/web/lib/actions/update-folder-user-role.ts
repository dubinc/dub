"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkFolderPermission } from "../folder/permissions";
import { folderUserRoleSchema } from "../zod/schemas/folders";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  folderId: z.string(),
  userId: z.string(),
  role: folderUserRoleSchema.nullable(),
});

// Update the folder user role
export const updateFolderUserRoleAction = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { folderId, userId, role } = parsedInput;

    if (user.id === userId) {
      throw new Error("You cannot update your own role.");
    }

    await checkFolderPermission({
      folderId,
      workspaceId: workspace.id,
      userId: user.id,
      requiredPermission: "folders.users.write",
    });

    await prisma.folderUser.upsert({
      where: {
        folderId_userId: {
          folderId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        folderId,
        userId,
        role,
      },
    });

    return { ok: true };
  });
