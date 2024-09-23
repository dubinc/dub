"use server";

import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import FolderEditAccessRequested from "emails/folder-edit-access-requested";
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

    const { users: folderUsers, ...folder } =
      await prisma.folder.findFirstOrThrow({
        where: {
          id: folderId,
          projectId: workspace.id,
        },
        include: {
          users: true,
        },
      });

    const requestedUser = folderUsers.find((user) => user.userId === user.id);

    if (requestedUser) {
      throw new Error("You already have access to this folder.");
    }

    const folderAccessRequest = await prisma.folderAccessRequest.findUnique({
      where: {
        folderId_userId: {
          folderId,
          userId: user.id,
        },
      },
    });

    if (folderAccessRequest) {
      throw new Error(
        "You already have a pending request to this folder. Please wait for the owner to approve it.",
      );
    }

    await prisma.folderAccessRequest.create({
      data: {
        folderId,
        userId: user.id,
      },
    });

    waitUntil(
      (async () => {
        const folderOwners = folderUsers.filter(
          (user) => user.role === "owner",
        );

        if (folderOwners.length === 0) {
          throw new Error(
            "No owner found for this folder. Please contact support.",
          );
        }

        const { email: ownerEmail } = await prisma.user.findUniqueOrThrow({
          where: {
            id: folderOwners[0].userId,
          },
          select: {
            email: true,
          },
        });

        await sendEmail({
          subject: `Request to edit folder ${folder.name} on ${workspace.name}`,
          email: ownerEmail!,
          react: FolderEditAccessRequested({
            email: ownerEmail!,
            appName: process.env.NEXT_PUBLIC_APP_NAME as string,
            folderUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/settings/folders/${folder.id}/members`,
            folder: {
              name: folder.name,
            },
            requestor: {
              name: user.name,
              email: user.email,
            },
          }),
        });
      })(),
    );

    return { ok: true };
  });
