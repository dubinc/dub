"use server";

import { prisma } from "@/lib/prisma";
import { FolderUserRole } from "@prisma/client";
import { z } from "zod";
import { throwIfNotAllowed } from "../link-folder/permissions";
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

    const [folder, folderUser] = await Promise.all([
      prisma.folder.findFirstOrThrow({
        where: {
          id: folderId,
          projectId: workspace.id,
        },
      }),

      prisma.folderUser.findUniqueOrThrow({
        where: {
          folderId_userId: {
            folderId,
            userId: user.id,
          },
        },
      }),
    ]);

    if (user.id === userId) {
      throw new Error("You cannot update your own role.");
    }

    throwIfNotAllowed({
      folder,
      folderUser,
      requiredPermission: "folders.users.write",
      fromServerAction: true,
    });

    await prisma.folderUser.upsert({
      where: {
        folderId_userId: {
          folderId,
          userId,
        },
      },
      update: {
        role: role as FolderUserRole,
      },
      create: {
        folderId,
        userId,
        role: role as FolderUserRole,
      },
    });

    return { ok: true };
  });
