import { withAuth } from "@/lib/auth";
import { deleteLink, editLink, processLink } from "@/lib/api/links";
import { NextResponse } from "next/server";
import {
  APP_DOMAIN_WITH_NGROK,
  GOOGLE_FAVICON_URL,
  getApexDomain,
  log,
} from "@dub/utils";
import { qstash } from "@/lib/cron";

// GET /api/links/[linkId] – get a link
export const GET = withAuth(async ({ headers, link }) => {
  // link is guaranteed to exist because if not we will return 404
  return NextResponse.json(link!, {
    headers,
  });
});

// PUT /api/links/[linkId] – update a link
export const PUT = withAuth(
  async ({ req, headers, project, link, session }) => {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response("Missing or invalid body.", { status: 400, headers });
    }
    if (Object.keys(body).length === 0) {
      return new Response("No fields to update.", { status: 304, headers });
    }

    const updatedLink = {
      ...link,
      ...body,
    };

    if (updatedLink.projectId !== link?.projectId) {
      return new Response(
        "Transferring links to another project is not yet supported.",
        {
          status: 403,
          headers,
        },
      );
    }

    const {
      link: processedLink,
      error,
      status,
    } = await processLink({
      payload: updatedLink,
      project,
    });

    if (error) {
      return new Response(error, { status, headers });
    }

    const [response, _] = await Promise.allSettled([
      editLink({
        // link is guaranteed to exist because if not we will return 404
        domain: link!.domain,
        key: link!.key,
        updatedLink: processedLink,
      }),
      ...(link &&
      processedLink.domain === "dub.sh" &&
      processedLink.url !== link.url
        ? [
            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/verify`,
              body: {
                linkId: link.id,
              },
            }),
          ]
        : []),
      // @ts-ignore
    ]).then((results) => results.map((result) => result.value));

    if (response === null) {
      return new Response("Duplicate key: This short link already exists.", {
        status: 409,
        headers,
      });
    }

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    needNotExceededUsage: true,
  },
);

// DELETE /api/links/[linkId] – delete a link
export const DELETE = withAuth(async ({ headers, link }) => {
  // link is guaranteed to exist because if not we will return 404
  const response = await deleteLink({
    domain: link!.domain,
    key: link!.key,
  });
  return NextResponse.json(response[0], {
    headers,
  });
});
