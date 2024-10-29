import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/analytics/share/[id] – delete a shared dashboard for a link
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;

    const res = await prisma.dashboard.delete({
      where: {
        id,
        projectId: workspace.id,
      },
    });

    // for backwards compatibility, we'll update the link to have publicStats = false
    if (res.linkId) {
      waitUntil(
        prisma.link.update({
          where: { id: res.linkId },
          data: { publicStats: false },
        }),
      );
    }

    return NextResponse.json({ id });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
