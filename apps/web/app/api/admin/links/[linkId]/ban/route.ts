import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
  getDomainWithoutWWW,
} from "@dub/utils";
import { NextResponse } from "next/server";

// DELETE /api/admin/links/[linkId]/ban – ban a link
export const DELETE = withAdmin(async ({ params }) => {
  const { linkId } = params as { linkId: string };

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return NextResponse.next();
  }

  const domain = getDomainWithoutWWW(link.url);

  const response = await Promise.all([
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        userId: LEGAL_USER_ID,
        projectId: LEGAL_WORKSPACE_ID,
      },
    }),
    redis.hset(link.domain.toLowerCase(), {
      [link.key.toLowerCase()]: {
        ...(await formatRedisLink(link)),
        projectId: LEGAL_WORKSPACE_ID,
      },
    }),
    domain &&
      updateConfig({
        key: "domains",
        value: domain,
      }),
  ]);

  return NextResponse.json(response);
});
