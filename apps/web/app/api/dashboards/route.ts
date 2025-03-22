import { createId } from "@/lib/api/create-id";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { dashboardSchema } from "@/lib/zod/schemas/dashboard";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/dashboards – get all dashboards
export const GET = withWorkspace(
  async ({ workspace }) => {
    const dashboards = await prisma.dashboard.findMany({
      where: { projectId: workspace.id },
    });

    return NextResponse.json(z.array(dashboardSchema).parse(dashboards));
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// POST /api/dashboards – create a new dashboard
export const POST = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const { domain, key } = domainKeySchema.parse(searchParams);

    const link = await getLinkOrThrow({
      workspaceId: workspace.id,
      domain,
      key,
    });

    if (link.folderId) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: link.folderId,
        requiredPermission: "folders.links.write",
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        id: createId({ prefix: "dash_" }),
        linkId: link.id,
        projectId: workspace.id,
        userId: link.userId,
      },
    });

    // for backwards compatibility, we'll update the link to have publicStats = true
    waitUntil(
      prisma.link.update({
        where: { id: link.id },
        data: { publicStats: true },
      }),
    );

    return NextResponse.json(dashboardSchema.parse(dashboard));
  },
  {
    requiredPermissions: ["links.write"],
  },
);
