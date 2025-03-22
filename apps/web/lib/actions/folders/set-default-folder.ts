"use server";

import { verifyFolderAccess } from "@/lib/folder/permissions";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const setDefaultFolderSchema = z.object({
  workspaceId: z.string(),
  folderId: z.string().nullable(),
});

// Set the default folder for a workspace for a user
export const setDefaultFolderAction = authActionClient
  .schema(setDefaultFolderSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user, workspace } = ctx;
    const { folderId } = parsedInput;

    if (folderId) {
      await verifyFolderAccess({
        workspace,
        userId: user.id,
        folderId,
        requiredPermission: "folders.read",
      });
    }

    await prisma.projectUsers.update({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workspace.id,
        },
      },
      data: {
        defaultFolderId: folderId,
      },
    });
  });
