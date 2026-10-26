import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/notification-preferences – get notification preferences for a workspace for the current user
export const GET = withWorkspace(async ({ workspace, session }) => {
  const response = await prisma.notificationPreference.findFirstOrThrow({
    select: {
      domainConfigurationUpdates: true,
      linkUsageSummary: true,
    },
    where: {
      projectUser: {
        userId: session.user.id,
        projectId: workspace.id,
      },
    },
  });

  return NextResponse.json(response);
});
