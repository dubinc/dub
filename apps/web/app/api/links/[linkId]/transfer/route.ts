import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { formatRedisLink } from "@/lib/upstash/format-redis-link";
import z from "@/lib/zod";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const transferLinkBodySchema = z.object({
  newWorkspaceId: z
    .string()
    .min(1, "Missing new workspace ID.")
    // replace "ws_" with "" to get the workspace ID
    .transform((v) => v.replace("ws_", "")),
});

// POST /api/links/[linkId]/transfer – transfer a link to another workspace
export const POST = withWorkspace(
  async ({ req, headers, session, params, workspace }) => {
    const link = await getLinkOrThrow({
      workspace,
      linkId: params.linkId,
    });

    const { newWorkspaceId } = transferLinkBodySchema.parse(await req.json());

    const newWorkspace = await prisma.project.findUnique({
      where: { id: newWorkspaceId },
      select: {
        linksUsage: true,
        linksLimit: true,
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!newWorkspace || newWorkspace.users.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "New workspace not found.",
      });
    }

    if (newWorkspace.linksUsage >= newWorkspace.linksLimit) {
      throw new DubApiError({
        code: "forbidden",
        message: "New workspace has reached its link limit.",
      });
    }

    const { clicks: linkClicks } = await getAnalytics({
      event: "clicks",
      groupBy: "count",
      linkId: link.id,
      interval: "30d",
    });

    const response = await prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        projectId: newWorkspaceId,
        // remove tags when transferring link
        tags: {
          deleteMany: {},
        },
      },
    });

    waitUntil(
      Promise.all([
        linkCache.set({
          link: await formatRedisLink({ ...link, projectId: newWorkspaceId }),
          domain: link.domain,
          key: link.key,
        }),

        recordLink({
          link_id: link.id,
          domain: link.domain,
          key: link.key,
          url: link.url,
          tag_ids: [],
          workspace_id: newWorkspaceId,
          created_at: link.createdAt,
        }),
        // decrement old workspace usage
        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            usage: {
              decrement: linkClicks,
            },
            linksUsage: {
              decrement: 1,
            },
          },
        }),
        // increment new workspace usage
        prisma.project.update({
          where: {
            id: newWorkspaceId,
          },
          data: {
            usage: {
              increment: linkClicks,
            },
            linksUsage: {
              increment: 1,
            },
          },
        }),

        // Remove the webhooks associated with the link
        prisma.linkWebhook.deleteMany({
          where: {
            linkId: link.id,
          },
        }),
      ]),
    );

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
