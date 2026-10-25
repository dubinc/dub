import { prisma } from "@/lib/prisma";
import { Webhook } from "@prisma/client";
import * as z from "zod/v4";
import { DubApiError } from "../api/errors";
import { Session } from "../auth";
import { getFolders } from "../folder/get-folders";
import { WorkspaceProps } from "../types";
import { createWebhookSchema } from "../zod/schemas/webhooks";

export async function validateWebhook({
  input,
  workspace,
  webhook,
  user,
}: {
  input: Partial<z.infer<typeof createWebhookSchema>>;
  workspace: Pick<WorkspaceProps, "id">;
  webhook?: Webhook;
  user: Session["user"];
}) {
  const { url, linkScope, linkIds, folderIds } = input;

  if (url) {
    const webhookUrlExists = await prisma.webhook.findFirst({
      where: {
        projectId: workspace.id,
        url,
        ...(webhook && {
          id: {
            not: webhook.id,
          },
        }),
      },
    });

    if (webhookUrlExists) {
      throw new DubApiError({
        code: "conflict",
        message: "A Webhook with this URL already exists.",
      });
    }
  }

  if (linkScope === "links" && linkIds && linkIds.length > 0) {
    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: user.id,
    });

    const links = await prisma.link.findMany({
      where: {
        id: {
          in: linkIds,
        },
        projectId: workspace.id,
        OR: [
          { folderId: null },
          { folderId: { in: folders.map((folder) => folder.id) } },
        ],
      },
      select: {
        id: true,
      },
    });

    if (links.length !== linkIds.length) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Invalid link IDs provided. Please check the links you are adding the webhook to.",
      });
    }
  }

  if (linkScope === "folders" && folderIds && folderIds.length > 0) {
    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: user.id,
    });

    const accessibleFolderIds = new Set(folders.map((folder) => folder.id));

    if (!folderIds.every((folderId) => accessibleFolderIds.has(folderId))) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Invalid folder IDs provided. Please check the folders you are adding the webhook to.",
      });
    }
  }
}
