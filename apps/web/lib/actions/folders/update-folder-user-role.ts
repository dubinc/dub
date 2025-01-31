"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { verifyFolderAccess } from "../../folder/permissions";
import { folderUserRoleSchema } from "../../zod/schemas/folders";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  folderId: z.string(),
  userId: z.string(),
  role: folderUserRoleSchema.nullable(),
});

// Update the folder user role
export const updateUserRoleInFolder = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { folderId, userId, role } = parsedInput;

    if (user.id === userId) {
      throw new Error("You cannot update your own role.");
    }

    await verifyFolderAccess({
      workspaceId: workspace.id,
      userId: user.id,
      folderId,
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

    // TODO:
    // Remove the folder request if the user has a pending request
  });
