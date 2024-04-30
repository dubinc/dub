import { DubApiError } from "@/lib/api/errors";
import { LinkWithTags, transformLink } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LinkSchemaExtended, getLinkInfoQuerySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/links/info – get the info for a link
export const GET = withWorkspace(async ({ headers, searchParams, link }) => {
  const { domain, key, linkId, externalId } =
    getLinkInfoQuerySchema.parse(searchParams);

  if (!domain && !key && !linkId && !externalId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "You must provide a domain and key, or linkId or externalId to retrieve a link.",
      docUrl: "https://dub.co/docs/api-reference/endpoint/retrieve-a-link",
    });
  }

  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  // TODO:
  // Find a better way, we already have a link object
  const tagsAndUser = await prisma.link.findUnique({
    where: {
      id: link.id,
    },
    select: {
      user: true,
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  const linkWithTags: LinkWithTags = tagsAndUser
    ? { ...link, ...tagsAndUser }
    : { ...link, tags: [] };

  return NextResponse.json(
    LinkSchemaExtended.parse(transformLink(linkWithTags)),
    {
      headers,
    },
  );
});
