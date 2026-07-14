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
    requiredPlan: ["business", "advanced", "enterprise"],
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
        links: {
          select: {
            linkId: true,
          },
        },
        folders: {
          select: {
            folderId: true,
          },
        },
      },
    });

    const { name, url, triggers, linkScope, linkIds, folderIds } = input;

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

    const nextLinkScope = hasLinkClickedTrigger
      ? linkScope !== undefined
        ? linkScope
        : existingWebhook.linkScope
      : null;

    const existingLinkIds = existingWebhook.links.map(({ linkId }) => linkId);
    const existingFolderIds = existingWebhook.folders.map(
      ({ folderId }) => folderId,
    );

    const nextLinkIds = linkIds !== undefined ? linkIds : existingLinkIds;
    const nextFolderIds =
      folderIds !== undefined ? folderIds : existingFolderIds;

    const nextWebhook: Partial<NewWebhook> = {
      ...existingWebhook,
      ...input,
      triggers: finalTriggers,
      linkScope: nextLinkScope,
      ...(hasLinkClickedTrigger &&
        nextLinkScope === "links" && { linkIds: nextLinkIds }),
      ...(hasLinkClickedTrigger &&
        nextLinkScope === "folders" && { folderIds: nextFolderIds }),
    };

    await validateWebhook({
      input: nextWebhook,
      workspace,
      webhook: existingWebhook,
      user: session.user,
    });

    const linkScopeChanged = nextLinkScope !== existingWebhook.linkScope;

    const shouldSyncLinks =
      (nextWebhook.linkScope !== "links" && existingLinkIds.length > 0) ||
      (nextWebhook.linkScope === "links" &&
        linkIds !== undefined &&
        !arrayEqual(existingLinkIds, linkIds ?? []));

    const shouldSyncFolders =
      (nextWebhook.linkScope !== "folders" && existingFolderIds.length > 0) ||
      (nextWebhook.linkScope === "folders" &&
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
          ...(linkScopeChanged && { linkScope: nextWebhook.linkScope }),
        },
      });

      if (shouldSyncLinks) {
        await tx.linkWebhook.deleteMany({
          where: {
            webhookId: webhookId,
          },
        });

        if (nextWebhook.linkScope === "links" && linkIds?.length) {
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

        if (nextWebhook.linkScope === "folders" && folderIds?.length) {
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
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);

// DELETE /api/webhooks/[webhookId] - delete a specific webhook
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    await prisma.webhook.findUniqueOrThrow({
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
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
