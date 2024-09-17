import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import {
  DomainSchema,
  transferDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/transfer – transfer a domain to another workspace
export const POST = withWorkspace(
  async ({ req, headers, session, params, workspace }) => {
    const { slug: domain, registeredDomain } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    if (registeredDomain) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot delete a Dub-provisioned domain.",
      });
    }

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

    const { clicks: totalLinkClicks } = await getAnalytics({
      domain,
      event: "clicks",
      groupBy: "count",
      workspaceId: workspace.id,
      interval: "30d",
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

    return NextResponse.json(DomainSchema.parse(domainResponse), { headers });
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
