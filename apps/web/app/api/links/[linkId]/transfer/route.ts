import { transferLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/links/[linkId]/transfer – transfer a link to another project
export const POST = withAuth(async ({ req, headers, session, link }) => {
  let body: { newProjectId: string };

  try {
    body = await req.json();
  } catch (error) {
    return new Response("Missing or invalid body.", { status: 400, headers });
  }

  if (!body.newProjectId) {
    return new Response("Missing new project ID.", { status: 400, headers });
  }

  const newProject = await prisma.project.findUnique({
    where: { id: body.newProjectId },
    select: {
      linksUsage: true,
      linksLimit: true,
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
    },
  });

  if (!newProject || newProject.users.length === 0) {
    return new Response("New project not found.", { status: 404, headers });
  }

  if (newProject.linksUsage >= newProject.linksLimit) {
    return new Response("New project has reached its link limit.", {
      status: 403,
      headers,
    });
  }

  const response = await Promise.all([
    transferLink({
      linkId: link!.id,
      newProjectId: body.newProjectId,
    }),
    // set this in redis so we can use it in the event cron job
    redis.set(`transfer:${link!.id}:oldProjectId`, link!.projectId),
  ]);

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/event`,
    body: {
      linkId: link!.id,
      type: "transfer",
    },
  });

  return NextResponse.json(response, {
    headers,
  });
});
