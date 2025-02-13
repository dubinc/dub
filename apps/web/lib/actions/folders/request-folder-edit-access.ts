"use server";

import { sendEmail } from "@dub/email";
import { FolderEditAccessRequested } from "@dub/email/templates/folder-edit-access-requested";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { verifyFolderAccess } from "../../folder/permissions";
import { authActionClient } from "../safe-action";

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

    const folder = await verifyFolderAccess({
      workspace,
      userId: user.id,
      folderId,
      requiredPermission: "folders.read",
    });

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
        const folderOwner = await prisma.folderUser.findFirstOrThrow({
          where: {
            folderId,
            role: "owner",
          },
          select: {
            userId: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        });

        const folderOwnerEmail = folderOwner.user.email!;

        await sendEmail({
          subject: `Request to edit folder ${folder.name} on ${workspace.name}`,
          email: folderOwnerEmail,
          react: FolderEditAccessRequested({
            email: folderOwnerEmail,
            folderUrl: `${APP_DOMAIN_WITH_NGROK}/${workspace.slug}/settings/library/folders/${folder.id}/members`,
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
  });
