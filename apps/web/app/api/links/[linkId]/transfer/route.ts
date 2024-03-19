import { DubApiError } from "@/lib/api/errors";
import { transferLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const transferLinkBodySchema = z.object({
  newWorkspaceId: z
    .string()
    .min(1, "Missing new workspace ID.")
    // replace "ws_" with "" to get the workspace ID
    .transform((v) => v.replace("ws_", "")),
});

// POST /api/links/[linkId]/transfer – transfer a link to another workspace
export const POST = withAuth(async ({ req, headers, session, link }) => {
  const { newWorkspaceId } = transferLinkBodySchema.parse(await req.json());

  const newWorkspace = await prisma.project.findUnique({
    where: { id: newWorkspaceId },
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

  if (!newWorkspace || newWorkspace.users.length === 0) {
    throw new DubApiError({
      code: "not_found",
      message: "New workspace not found.",
    });
  }

  if (newWorkspace.linksUsage >= newWorkspace.linksLimit) {
    throw new DubApiError({
      code: "forbidden",
      message: "New workspace has reached its link limit.",
    });
  }

  const response = await Promise.all([
    transferLink({
      linkId: link!.id,
      newWorkspaceId,
    }),
    // set this in redis so we can use it in the event cron job
    redis.set(`transfer:${link!.id}:oldWorkspaceId`, link!.projectId),
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
