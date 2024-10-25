import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { createId } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/analytics/share – get a shared dashboard for a link
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { domain, key } = domainKeySchema.parse(searchParams);

    const link = await getLinkOrThrow({
      workspace,
      domain,
      key,
    });

    const dashboard = await prisma.dashboard.findUnique({
      where: { linkId: link.id },
    });

    return NextResponse.json(dashboard);
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// POST /api/analytics/share – create a shared dashboard for a link
export const POST = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { domain, key } = domainKeySchema.parse(searchParams);

    const link = await getLinkOrThrow({
      workspace,
      domain,
      key,
    });

    const response = await prisma.dashboard.create({
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

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["links.write"],
  },
);
