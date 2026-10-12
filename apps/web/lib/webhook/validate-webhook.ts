import { prisma } from "@/lib/prisma";
import { Webhook } from "@prisma/client";
import * as z from "zod/v4";
import { DubApiError } from "../api/errors";
import { getDefaultProgramIdOrThrow } from "../api/programs/get-default-program-id-or-throw";
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
  workspace: Pick<WorkspaceProps, "id" | "defaultProgramId">;
  webhook?: Webhook;
  user: Session["user"];
}) {
  const { url, linkScope, linkIds, folderIds, triggers } = input;

  // external_payout.confirmed (and deprecated payout.confirmed) require external payouts
  const hasExternalPayoutTrigger =
    triggers?.includes("external_payout.confirmed") ||
    triggers?.includes("payout.confirmed");

  if (hasExternalPayoutTrigger) {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        payoutMode: true,
      },
    });

    // TODO: Maybe show this for all in the future?
    if (program.payoutMode === "internal") {
      const unavailableTrigger = triggers?.includes("external_payout.confirmed")
        ? "external_payout.confirmed"
        : "payout.confirmed";

      throw new DubApiError({
        code: "bad_request",
        message: `The '${unavailableTrigger}' trigger is not currently available for your workspace.`,
      });
    }
  }

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
