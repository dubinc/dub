import { DubApiError } from "@/lib/api/errors";
import { transformLink } from "@/lib/api/links";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLinkInfoQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/info – get the info for a link
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace }) => {
    const { domain, key, linkId, externalId } =
      getLinkInfoQuerySchema.parse(searchParams);

    if (!domain && !key && !linkId && !externalId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You must provide a domain and a key or a linkId or an externalId to retrieve a link.",
        docUrl: "https://dub.co/docs/api-reference/endpoint/retrieve-a-link",
      });
    }

    const link = await getLinkOrThrow({
      workspace,
      linkId,
      externalId,
      domain,
      key,
    });

    const tags = await prisma.tag.findMany({
      where: {
        links: {
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

    const response = transformLink({
      ...link,
      tags: tags.map((tag) => {
        return { tag };
      }),
    });

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredScopes: ["links.read"],
  },
);
