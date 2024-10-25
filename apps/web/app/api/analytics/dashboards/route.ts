import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { createId } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dashboardSchema } from "@/lib/zod/schemas/dashboard";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/analytics/dashboards – get all dashboards
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

// POST /api/analytics/dashboards – create a new dashboard
export const POST = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { domain, key } = domainKeySchema.parse(searchParams);

    const link = await getLinkOrThrow({
      workspace,
      domain,
      key,
    });

    const dashboard = await prisma.dashboard.create({
      data: {
        id: createId({ prefix: "dash_" }),
        linkId: link.id,
        projectId: workspace.id,
        userId: link.userId,
        showConversions: link.trackConversion,
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
