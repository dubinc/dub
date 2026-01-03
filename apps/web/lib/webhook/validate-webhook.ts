import { prisma } from "@dub/prisma";
import { Webhook } from "@dub/prisma/client";
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
  const { url, linkIds, triggers } = input;

  // payout.confirmed trigger requires external payouts enabled
  if (triggers && triggers.includes("payout.confirmed")) {
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
      throw new DubApiError({
        code: "bad_request",
        message: `The 'payout.confirmed' trigger is not currently available for your workspace.`,
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

  if (linkIds && linkIds.length > 0) {
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
}
