import { DubApiError } from "@/lib/api/errors";
import { basicLink, transformLink } from "@/lib/api/links";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import {
  resolveLinkSchema
} from "@/lib/zod/schemas/links";

// POST /api/links/route - SDK link resolution
export const POST = withWorkspace(
  async ({ req, headers, workspace }) => {

    const schema = resolveLinkSchema.parse(await parseRequestBody(req))

    let url = URL.parse(schema.link)
    let domain = url?.host
    let key = url?.pathname.split('/')[1]

    // Apps never use linkId or externalId
    let linkId = undefined
    let externalId = undefined

    if (!domain && !key) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You must provide a domain and a key to retrieve a link.",
        docUrl: "https://dub.co/docs/api-reference/endpoint/retrieve-a-link",
      });
    }

    const link = await getLinkOrThrow({
      workspaceId: workspace.id,
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

    const response = basicLink(link);

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
