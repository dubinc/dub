import { getDomain } from "@/lib/api/domains/get-domain";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/primary – set a domain as primary
export const POST = withWorkspace(
  async ({ headers, workspace, domain }) => {
    await Promise.all([
      prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          primary: true,
        },
      }),
      // Set all other domains as not primary
      prisma.domain.updateMany({
        where: {
          projectId: workspace.id,
          primary: true,
          slug: {
            not: domain,
          },
        },
        data: {
          primary: false,
        },
      }),
    ]);

    const domainRecord = await getDomain({
      slug: domain,
      workspaceId: workspace.id,
    });

    return NextResponse.json(domainRecord, { headers });
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);
