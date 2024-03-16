import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { deleteLink, editLink, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth/utils";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { LinkWithTagIdsProps } from "@/lib/types";
import { updateLinkBodySchema } from "@/lib/zod/schemas/links";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/[linkId] – get a link
export const GET = withAuth(async ({ headers, link }) => {
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
  // link is guaranteed to exist because if not we will return 404
  return NextResponse.json(
    {
      ...link,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
    },
    {
      headers,
    },
  );
});

// PUT /api/links/[linkId] – update a link
export const PUT = withAuth(async ({ req, headers, project, link }) => {
  const body = updateLinkBodySchema.parse(await req.json());

  const updatedLink = {
    ...link,
    ...body,
  };

  if (updatedLink.projectId !== link?.projectId) {
    throw new DubApiError({
      code: "forbidden",
      message: "Transferring links to another project is not yet supported.",
    });
  }

  const {
    link: processedLink,
    error,
    code,
  } = await processLink({
    payload: updatedLink as LinkWithTagIdsProps,
    project,
    // if domain and key are the same, we don't need to check if the key exists
    skipKeyChecks:
      link!.domain === updatedLink.domain &&
      link!.key.toLowerCase() === updatedLink.key?.toLowerCase(),
  });

  if (error) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const [response, _] = await Promise.allSettled([
    editLink({
      // link is guaranteed to exist because if not we will return 404
      domain: link!.domain,
      key: link!.key,
      updatedLink: processedLink as any, // TODO: fix types
    }),
    qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/event`,
      body: {
        linkId: link!.id,
        type: "edit",
      },
    }),
    // @ts-ignore
  ]).then((results) => results.map((result) => result.value));

  return NextResponse.json(response, {
    headers,
  });
});

// DELETE /api/links/[linkId] – delete a link
export const DELETE = withAuth(async ({ headers, link }) => {
  // link is guaranteed to exist because if not we will return 404
  const response = await deleteLink(link!.id);

  return NextResponse.json(response[0], {
    headers,
  });
});
