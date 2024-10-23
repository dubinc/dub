import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@dub/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
  getDomainWithoutWWW,
} from "@dub/utils";
import { NextResponse } from "next/server";

// DELETE /api/admin/links/ban – ban a dub.sh link by key
export const DELETE = withAdmin(async ({ searchParams }) => {
  const { key } = searchParams as { linkId?: string; key?: string };

  if (!key) {
    return NextResponse.json({ error: "No key provided" }, { status: 400 });
  }

  const link = await prisma.link.findUnique({
    where: { domain_key: { domain: "dub.sh", key } },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const domain = getDomainWithoutWWW(link.url);

  const response = await Promise.all([
    prisma.link.update({
      where: {
        id: link.id,
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
