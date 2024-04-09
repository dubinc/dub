import { getAnalytics } from "@/lib/analytics";
import { setRootDomain } from "@/lib/api/domains";
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
    const { domain } = params;
    const { newWorkspaceId } = transferDomainBodySchema.parse(await req.json());

    if (newWorkspaceId === workspace.id) {
      throw new DubApiError({
        code: "bad_request",
        message: "Please select another workspace to transfer the domain to.",
      });
    }

    const newWorkspace = await prisma.project.findUnique({
      where: { id: newWorkspaceId },
      select: {
        plan: true,
        linksUsage: true,
        linksLimit: true,
        domainsLimit: true,
        name: true,
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
        domains: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!newWorkspace || newWorkspace.users.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "New workspace not found. Make sure you have access to it.",
      });
    }

    const domainRecord = await prisma.domain.findUnique({
      where: { slug: domain, projectId: workspace.id },
    });

    if (!domainRecord) {
      throw new DubApiError({
        code: "not_found",
        message: "Domain not found. Make sure you spelled it correctly.",
      });
    }

    if (newWorkspace.domains.length >= newWorkspace.domainsLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: `Workspace ${newWorkspace.name} has reached its domain limit (${newWorkspace.domainsLimit}). You need to upgrade it to accommodate more domains.`,
      });
    }

    if (newWorkspace.linksUsage >= newWorkspace.linksLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: `Workspace ${newWorkspace.name} has reached its link limit.`,
      });
    }

    const linksCount = await prisma.link.count({
      where: { domain, projectId: workspace.id },
    });

    if (newWorkspace.linksUsage + linksCount > newWorkspace.linksLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: `Workspace ${newWorkspace.name} doesn't have enough space to accommodate the links of the domain ${domain}.`,
      });
    }

    const totalLinkClicks = await getAnalytics({
      domain,
      workspaceId: workspace.id,
      endpoint: "clicks",
      interval: "30d",
      excludeRoot: true,
    });

    // Update the domain to use the new workspace
    const [domainResponse] = await Promise.all([
      prisma.domain.update({
        where: { slug: domain, projectId: workspace.id },
        data: {
          projectId: newWorkspaceId,
          primary: newWorkspace.domains.length === 0,
        },
      }),
      setRootDomain({
        id: domainRecord.id,
        domain,
        projectId: newWorkspaceId,
        ...(newWorkspace.plan !== "free" &&
          domainRecord.target && {
            url: domainRecord.target,
          }),
        rewrite: domainRecord.type === "rewrite",
      }),
      prisma.project.update({
        where: { id: workspace.id },
        data: {
          usage: {
            set: Math.max(workspace.usage - totalLinkClicks, 0),
          },
          linksUsage: {
            set: Math.max(workspace.linksUsage - linksCount, 0),
          },
        },
      }),
      prisma.project.update({
        where: { id: newWorkspaceId },
        data: {
          usage: {
            increment: totalLinkClicks,
          },
          linksUsage: {
            increment: linksCount,
          },
        },
      }),
    ]);

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/transfer`,
      body: {
        currentWorkspaceId: workspace.id,
        newWorkspaceId,
        domain,
        linksCount,
      },
    });

    return NextResponse.json(domainResponse, { headers });
  },
  { requiredRole: ["owner"] },
);
