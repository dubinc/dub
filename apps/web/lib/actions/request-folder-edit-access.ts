"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  folderId: z.string(),
});

// Request edit access to a folder
export const requestFolderEditAccessAction = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { folderId } = parsedInput;

    const [folder, folderUser, folderAccessRequest] = await Promise.all([
      prisma.folder.findFirst({
        where: {
          id: folderId,
          projectId: workspace.id,
          users: {
            some: {
              role: "owner",
            },
          },
        },
        include: {
          users: {
            select: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.folderUser.findUnique({
        where: {
          folderId_userId: {
            folderId,
            userId: user.id,
          },
        },
      }),

      prisma.folderAccessRequest.findUnique({
        where: {
          folderId_userId: {
            folderId,
            userId: user.id,
          },
        },
      }),
    ]);

    if (!folder) {
      throw new Error("Folder not found.");
    }

    if (folderUser) {
      throw new Error("You already have access to this folder.");
    }

    if (folderAccessRequest) {
      throw new Error(
        "You already have a pending request to this folder. Please wait for the owner to approve it.",
      );
    }

    console.log({ folder, folderUser, folderAccessRequest });

    await prisma.folderAccessRequest.create({
      data: {
        folderId,
        userId: user.id,
      },
    });

    // TODO:
    // Send email to folder owner

    return { ok: true };
  });
