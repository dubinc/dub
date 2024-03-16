import { DubApiError } from "@/lib/api/errors";
import { transferLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth/utils";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const transferLinkBodySchema = z.object({
  newProjectId: z.string().min(1, "Missing new project ID."),
});

// POST /api/links/[linkId]/transfer – transfer a link to another project
export const POST = withAuth(async ({ req, headers, session, link }) => {
  const { newProjectId } = transferLinkBodySchema.parse(await req.json());

  const newProject = await prisma.project.findUnique({
    where: { id: newProjectId },
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
    throw new DubApiError({
      code: "not_found",
      message: "New project not found.",
    });
  }

  if (newProject.linksUsage >= newProject.linksLimit) {
    throw new DubApiError({
      code: "forbidden",
      message: "New project has reached its link limit.",
    });
  }

  const response = await Promise.all([
    transferLink({
      linkId: link!.id,
      newProjectId,
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
