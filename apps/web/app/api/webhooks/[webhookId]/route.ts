import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/folder/get-folders";
import { webhookCache } from "@/lib/webhook/cache";
import { transformWebhook } from "@/lib/webhook/transform";
import { toggleWebhooksForWorkspace } from "@/lib/webhook/update-webhook";
import { isLinkLevelWebhook } from "@/lib/webhook/utils";
import { updateWebhookSchema } from "@/lib/zod/schemas/webhooks";
import { prisma } from "@dub/prisma";
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
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        disabledAt: true,
        links: true,
        installationId: true,
      },
    });

    return NextResponse.json(transformWebhook(webhook));
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

    const { name, url, triggers, linkIds } = updateWebhookSchema.parse(
      await parseRequestBody(req),
    );

    const existingWebhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
    });

    // If the webhook is managed by an integration, only the linkIds & triggers can be updated manually.
    if (existingWebhook.installationId && (name || url)) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This webhook is managed by an integration. Only the linkIds & triggers can be updated.",
      });
    }

    if (url) {
      const webhookUrlExists = await prisma.webhook.findFirst({
        where: {
          projectId: workspace.id,
          url,
          id: {
            not: webhookId,
          },
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
        userId: session.user.id,
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

    const oldLinks = await prisma.linkWebhook.findMany({
      where: {
        webhookId,
      },
      select: {
        linkId: true,
      },
    });

    const webhook = await prisma.webhook.update({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(triggers && { triggers }),
        ...(linkIds && {
          links: {
            deleteMany: {},
            create: linkIds.map((linkId) => ({
              linkId,
            })),
          },
        }),
      },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        disabledAt: true,
        installationId: true,
        links: {
          select: {
            linkId: true,
          },
        },
      },
    });

    waitUntil(
      (async () => {
        // If the webhook is being changed from link level to workspace level, delete the cache
        if (
          isLinkLevelWebhook(existingWebhook) &&
          !isLinkLevelWebhook(webhook)
        ) {
          await webhookCache.delete(webhookId);

          const links = await prisma.link.findMany({
            where: {
              id: { in: oldLinks.map(({ linkId }) => linkId) },
            },
            include: {
              webhooks: {
                select: {
                  webhookId: true,
                },
              },
            },
          });

          await linkCache.mset(links);
        }

        // If the webhook is being changed from workspace level to link level, set the cache
        else if (isLinkLevelWebhook(webhook)) {
          await webhookCache.set(webhook);
        }

        const newLinkIds = webhook.links.map(({ linkId }) => linkId);
        const oldLinkIds = oldLinks.map(({ linkId }) => linkId);

        if (!newLinkIds.length && !oldLinkIds.length) {
          return;
        }

        const linksAdded = newLinkIds.filter(
          (linkId) => !oldLinkIds.includes(linkId),
        );

        const linksRemoved = oldLinkIds.filter(
          (linkId) => !newLinkIds.includes(linkId),
        );

        // No changes in the links
        if (!linksAdded.length && !linksRemoved.length) {
          return;
        }

        const links = await prisma.link.findMany({
          where: {
            id: { in: [...linksAdded, ...linksRemoved] },
          },
          include: {
            webhooks: {
              select: {
                webhookId: true,
              },
            },
          },
        });

        await linkCache.mset(links);
      })(),
    );

    return NextResponse.json(transformWebhook(webhook));
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

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      select: {
        installationId: true,
      },
    });

    if (webhook.installationId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This webhook is managed by an integration, hence cannot be deleted manually.",
      });
    }

    const linkWebhooks = await prisma.linkWebhook.findMany({
      where: {
        webhookId,
      },
      select: {
        linkId: true,
      },
    });

    await prisma.webhook.delete({
      where: {
        id: webhookId,
      },
    });

    waitUntil(
      (async () => {
        const links = await prisma.link.findMany({
          where: {
            id: { in: linkWebhooks.map(({ linkId }) => linkId) },
          },
          include: {
            webhooks: {
              select: {
                webhookId: true,
              },
            },
          },
        });

        await Promise.all([
          toggleWebhooksForWorkspace({
            workspaceId: workspace.id,
          }),
          linkCache.mset(links),
          webhookCache.delete(webhookId),
        ]);
      })(),
    );

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
