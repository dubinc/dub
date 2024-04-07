import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/domains/[domain]/primary – set a domain as primary
export const POST = withAuth(
  async ({ headers, workspace, domain }) => {
    const response = await Promise.all([
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
        },
        data: {
          primary: false,
        },
      }),
    ]);
    console.log({ response });
    return NextResponse.json(response, { headers });
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);
