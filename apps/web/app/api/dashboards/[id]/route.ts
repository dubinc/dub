import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  dashboardSchema,
  updateDashboardBodySchema,
} from "@/lib/zod/schemas/dashboard";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const getDashboardOrThrow = async ({
  id,
  workspaceId,
}: {
  id: string;
  workspaceId: string;
}) => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id, projectId: workspaceId },
  });

  if (!dashboard) {
    throw new DubApiError({
      code: "not_found",
      message: "Dashboard not found",
    });
  }

  return dashboard;
};

// PATCH /api/dashboards/[id] – update a dashboard
export const PATCH = withWorkspace(
  async ({ params, workspace, req }) => {
    const { id } = params;
    await getDashboardOrThrow({ id, workspaceId: workspace.id });

    const body = await req.json();
    const data = updateDashboardBodySchema.parse(body);

    const dashboard = await prisma.dashboard.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json(dashboardSchema.parse(dashboard));
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// DELETE /api/dashboards/[id] – delete a dashboard
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;
    await getDashboardOrThrow({ id, workspaceId: workspace.id });

    const dashboard = await prisma.dashboard.delete({
      where: {
        id,
        projectId: workspace.id,
      },
    });

    // for backwards compatibility, we'll update the link to have publicStats = false
    if (dashboard.linkId) {
      waitUntil(
        prisma.link.update({
          where: { id: dashboard.linkId },
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
