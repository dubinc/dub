import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/monitoring – get current monitoring schedules
export const GET = withAuth(async ({ req, project }) => {
  if (!project.monitoringId) {
    return NextResponse.json({
      schedule: null,
    });
  }
  const response = await qstash.schedules.get({
    id: project.monitoringId || "",
  });
  return NextResponse.json({
    schedule: response,
  });
});

// POST /api/projects/[slug]/monitoring – create a new monitoring schedule
export const POST = withAuth(
  async ({ req, project }) => {
    const { frequency } = await req.json();

    const { messageId } = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/monitoring`,
      headers: {
        "Upstash-Cron": frequency,
      },
      body: {
        projectId: project.id,
      },
    });

    const response = await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        monitoringId: messageId,
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["pro", "enterprise"],
  },
);

// DELETE /api/projects/[slug]/monitoring – delete a monitoring schedule
export const DELETE = withAuth(
  async ({ project }) => {
    const response = await qstash.schedules.delete({
      id: project.monitoringId || "",
    });

    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["pro", "enterprise"],
  },
);
