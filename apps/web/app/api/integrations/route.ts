import { withWorkspace } from "@/lib/auth";
import { installedIntegrationSchema } from "@/lib/zod/schemas/integration";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/integrations - get all active integrations
export const GET = withWorkspace(
  async ({ workspace }) => {
    const integrations = await prisma.integration.findMany({
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

    return NextResponse.json(
      integrations.map((integration) =>
        installedIntegrationSchema.parse(integration),
      ),
    );
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
