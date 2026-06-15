import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/integrations - get all active integrations
export const GET = withWorkspace(
  async ({ workspace }) => {
    const integrations = await prisma.integration.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        verified: true,
        projectId: true,
        logo: true,
      },
      where: {
        installations: {
          some: {
            project: {
              slug: workspace.slug,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(integrations);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
