import { linkCache } from "@/lib/api/links/cache";
import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { formatRedisLink } from "@/lib/upstash";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import {
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
  getDomainWithoutWWW,
} from "@dub/utils";
import { NextResponse } from "next/server";

// DELETE /api/admin/links/ban – ban a dub.sh link by key
export const DELETE = withAdmin(async ({ searchParams }) => {
  const { domain, key } = domainKeySchema.parse(searchParams);

  const link = await prisma.link.findUnique({
    where: { domain_key: { domain, key } },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const urlDomain = getDomainWithoutWWW(link.url);

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

    linkCache.set({
      link: await formatRedisLink({ ...link, projectId: LEGAL_WORKSPACE_ID }),
      domain: domain!,
      key,
    }),

    urlDomain &&
      updateConfig({
        key: "domains",
        value: urlDomain,
      }),
  ]);

  return NextResponse.json(response);
});
