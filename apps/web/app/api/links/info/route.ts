import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getLinkInfoQuerySchema } from "@/lib/zod/schemas/links";
import { linkConstructor } from "@dub/utils";
import { NextResponse } from "next/server";

// TODO:
// Move the link transform logic to a shared function.
// It has been duplicated in multiple places.

// GET /api/links/info – get the info for a link
export const GET = withAuth(async ({ headers, searchParams }) => {
  const { domain, key } = getLinkInfoQuerySchema.parse(searchParams);

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    include: {
      user: true,
    },
  });

  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  const tags = await prisma.tag.findMany({
    where: {
      linksNew: {
        some: {
          linkId: link.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  const shortLink = linkConstructor({
    domain: link.domain,
    key: link.key,
  });

  return NextResponse.json(
    {
      ...link,
      workspaceId: `ws_${link.projectId}`,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
      shortLink,
    },
    {
      headers,
    },
  );
});
