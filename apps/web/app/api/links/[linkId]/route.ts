import { deleteLink, editLink, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import { LinkProps } from "@/lib/types";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/[linkId] – get a link
export const GET = withAuth(async ({ headers, link }) => {
  // link is guaranteed to exist because if not we will return 404
  return NextResponse.json(link!, {
    headers,
  });
});

// PUT /api/links/[linkId] – update a link
export const PUT = withAuth(async ({ req, headers, project, link }) => {
  try {
    const body = createLinkBodySchema.parse(await req.json());

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
      status,
    } = await processLink({
      payload: updatedLink as LinkProps,
      project,
    });

    // TODO: handle error
    if (error) {
      return new Response(error, { status, headers });
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

    if (response === null) {
      throw new DubApiError({
        code: "conflict",
        message: "Duplicate key: This short link already exists.",
      });
    }

    return NextResponse.json(response, {
      headers,
    });
  } catch (err) {
    return handleAndReturnErrorResponse(err, headers);
  }
});

// DELETE /api/links/[linkId] – delete a link
export const DELETE = withAuth(async ({ headers, link }) => {
  // link is guaranteed to exist because if not we will return 404
  const response = await deleteLink(link!);

  return NextResponse.json(response[0], {
    headers,
  });
});
