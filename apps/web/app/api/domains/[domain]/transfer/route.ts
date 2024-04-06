import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const transferDomainBodySchema = z.object({
  newWorkspaceId: z
    .string()
    .min(1, "Missing new workspace ID.")
    .transform((v) => v.replace("ws_", "")),
});

// POST /api/domains/[domain]/transfer – transfer a domain to another workspace
export const POST = withAuth(
  async ({ req, headers, session, params, workspace }) => {
    const { newWorkspaceId } = transferDomainBodySchema.parse(await req.json());
    const { domain } = params;

    const newWorkspace = await prisma.project.findUnique({
      where: { id: newWorkspaceId },
      select: {
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

    const domainFound = await prisma.domain.findUnique({
      where: { slug: domain, projectId: workspace.id },
    });

    if (!domainFound) {
      throw new DubApiError({
        code: "not_found",
        message: "Domain not found",
      });
    }

    await prisma.domain.update({
      where: { slug: domain, projectId: workspace.id },
      data: { projectId: newWorkspaceId },
    });

    qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/transfer`,
      body: {
        currentWorkspaceId: workspace.id,
        newWorkspaceId,
        domain,
      },
    });

    return NextResponse.json({}, { headers });

    // const link = await prisma.link.findUnique({
    //   where: {
    //     id: params.linkId,
    //   },
    //   include: {
    //     tags: true,
    //   },
    // });

    // if (newWorkspace.linksUsage >= newWorkspace.linksLimit) {
    //   throw new DubApiError({
    //     code: "forbidden",
    //     message: "New workspace has reached its link limit.",
    //   });
    // }

    // const linkClicks = await getAnalytics({
    //   linkId: link.id,
    //   endpoint: "clicks",
    //   interval: "30d",
    // });

    // const response = await Promise.all([
    //   prisma.link.update({
    //     where: {
    //       id: link.id,
    //     },
    //     data: {
    //       projectId: newWorkspaceId,
    //       // remove tags when transferring link
    //       tags: {
    //         deleteMany: {},
    //       },
    //     },
    //   }),
    //   redis.hset(link.domain, {
    //     [link.key.toLowerCase()]: await formatRedisLink({
    //       ...link,
    //       projectId: newWorkspaceId,
    //     }),
    //   }),
    //   recordLink({
    //     link: {
    //       ...link,
    //       projectId: newWorkspaceId,
    //     },
    //   }),
    //   // decrement old workspace usage
    //   prisma.project.update({
    //     where: {
    //       id: workspace.id,
    //     },
    //     data: {
    //       usage: {
    //         decrement: linkClicks,
    //       },
    //       linksUsage: {
    //         decrement: 1,
    //       },
    //     },
    //   }),
    //   // increment new workspace usage
    //   prisma.project.update({
    //     where: {
    //       id: newWorkspaceId,
    //     },
    //     data: {
    //       usage: {
    //         increment: linkClicks,
    //       },
    //       linksUsage: {
    //         increment: 1,
    //       },
    //     },
    //   }),
    // ]);
  },
  { requiredRole: ["owner"] },
);
