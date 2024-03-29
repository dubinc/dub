import { getAnalytics } from "@/lib/analytics";
import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { formatRedisLink, redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const transferLinkBodySchema = z.object({
  newWorkspaceId: z
    .string()
    .min(1, "Missing new workspace ID.")
    // replace "ws_" with "" to get the workspace ID
    .transform((v) => v.replace("ws_", "")),
});

// POST /api/links/[linkId]/transfer – transfer a link to another workspace
export const POST = withAuth(
  async ({ req, headers, session, params, workspace }) => {
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

    const link = await prisma.link.findUnique({
      where: {
        id: params.linkId,
      },
      include: {
        tags: true,
      },
    });
    // technically this is not needed since the link is already checked in withAuth
    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: "Link not found.",
      });
    }

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

    const linkClicks = await getAnalytics({
      linkId: link.id,
      endpoint: "clicks",
      interval: "30d",
    });

    const response = await Promise.all([
      prisma.link.update({
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
      }),
      redis.hset(link.domain, {
        [link.key.toLowerCase()]: await formatRedisLink({
          ...link,
          projectId: newWorkspaceId,
        }),
      }),
      recordLink({
        link: {
          ...link,
          projectId: newWorkspaceId,
        },
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
    ]);

    return NextResponse.json(response, {
      headers,
    });
  },
);
