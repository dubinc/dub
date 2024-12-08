import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { withWorkspace } from "@/lib/auth";
import { dashboardSchema } from "@/lib/zod/schemas/dashboard";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /links/[linkId]/dashboard – get dashboard for a given link
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const { linkId } = params;

    const link = await getLinkOrThrow({
      linkId,
      workspaceId: workspace.id,
    });

    const dashboard = await prisma.dashboard.findUnique({
      where: {
        linkId: link.id,
      },
    });

    if (!dashboard) {
      return NextResponse.json(null); // This is debatable: 404 vs null?
    }

    return NextResponse.json(dashboardSchema.parse(dashboard));
  },
  {
    requiredPermissions: ["links.read"],
  },
);
