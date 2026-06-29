import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewWebhook } from "@/lib/types";
import { syncWorkspaceWebhookStatus } from "@/lib/webhook/click-webhook-workspaces";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "@/lib/webhook/constants";
import type { WebhookTrigger } from "@/lib/webhook/types";
import { validateWebhook } from "@/lib/webhook/validate-webhook";
import { updateWebhookSchema, WebhookSchema } from "@/lib/zod/schemas/webhooks";
import { arrayEqual } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/webhooks/[webhookId] - get info about a specific webhook
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
    });

    return NextResponse.json(WebhookSchema.parse(webhook));
  },
  {
    requiredPermissions: ["webhooks.read"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// PATCH /api/webhooks/[webhookId] - update a specific webhook
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { webhookId } = params;

    const input = updateWebhookSchema.parse(await parseRequestBody(req));

    const existingWebhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      include: {
        links: true,
        folders: true,
      },
    });

    const { name, url, triggers, scope, linkIds, folderIds } = input;

    // If the webhook is managed by an integration, only the linkIds & triggers can be updated manually.
    if (existingWebhook.installationId && (name || url)) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This webhook is managed by an integration. Only the linkIds & triggers can be updated.",
      });
    }

    const finalTriggers = (
      triggers !== undefined ? triggers : existingWebhook.triggers
    ) as WebhookTrigger[];

    const hasLinkClickedTrigger = finalTriggers.includes(
      LINK_CLICK_WEBHOOK_TRIGGER,
    );

    const nextScope = hasLinkClickedTrigger
      ? scope !== undefined
        ? scope
        : existingWebhook.scope
      : null;

    const nextWebhook: Partial<NewWebhook> = {
      ...existingWebhook,
      ...input,
      triggers: finalTriggers,
      scope: nextScope,
    };

    await validateWebhook({
      input: nextWebhook,
      workspace,
      webhook: existingWebhook,
      user: session.user,
    });

    const existingLinkIds = existingWebhook.links.map((link) => link.linkId);
    const existingFolderIds = existingWebhook.folders.map(
      (folder) => folder.folderId,
    );

    const scopeChanged = nextScope !== existingWebhook.scope;

    const shouldSyncLinks =
      (nextWebhook.scope !== "links" && existingLinkIds.length > 0) ||
      (nextWebhook.scope === "links" &&
        linkIds !== undefined &&
        !arrayEqual(existingLinkIds, linkIds ?? []));

    const shouldSyncFolders =
      (nextWebhook.scope !== "folders" && existingFolderIds.length > 0) ||
      (nextWebhook.scope === "folders" &&
        folderIds !== undefined &&
        !arrayEqual(existingFolderIds, folderIds ?? []));

    const updatedWebhook = await prisma.$transaction(async (tx) => {
      const updatedWebhook = await tx.webhook.update({
        where: {
          id: webhookId,
        },
        data: {
          ...(name !== undefined && { name }),
          ...(url !== undefined && { url }),
          ...(triggers !== undefined && { triggers }),
          ...(scopeChanged && { scope: nextWebhook.scope }),
        },
      });

      if (shouldSyncLinks) {
        await tx.linkWebhook.deleteMany({
          where: {
            webhookId: webhookId,
          },
        });

        if (nextWebhook.scope === "links" && linkIds?.length) {
          await tx.linkWebhook.createMany({
            data: linkIds.map((linkId) => ({
              linkId,
              webhookId,
            })),
          });
        }
      }

      if (shouldSyncFolders) {
        await tx.folderWebhook.deleteMany({
          where: {
            webhookId,
          },
        });

        if (nextWebhook.scope === "folders" && folderIds?.length) {
          await tx.folderWebhook.createMany({
            data: folderIds.map((folderId) => ({
              folderId,
              webhookId,
            })),
          });
        }
      }

      return updatedWebhook;
    });

    waitUntil(syncWorkspaceWebhookStatus(workspace.id));

    return NextResponse.json(WebhookSchema.parse(updatedWebhook));
  },
  {
    requiredPermissions: ["webhooks.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// DELETE /api/webhooks/[webhookId] - delete a specific webhook
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    const existingWebhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
    });

    await prisma.webhook.delete({
      where: {
        id: webhookId,
      },
    });

    waitUntil(syncWorkspaceWebhookStatus(workspace.id));

    return NextResponse.json({
      id: webhookId,
    });
  },
  {
    requiredPermissions: ["webhooks.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
