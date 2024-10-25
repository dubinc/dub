import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/analytics/share/[id] – delete a shared dashboard for a link
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;

    await prisma.dashboard.delete({
      where: {
        id,
        projectId: workspace.id,
      },
    });

    return NextResponse.json({ id });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
