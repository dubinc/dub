import { withAuth } from "@/lib/auth";
import { deleteLink, editLink, processKey } from "@/lib/api/links";
import { NextResponse } from "next/server";
import { isBlacklistedDomain, isBlacklistedKey } from "@/lib/edge-config";
import { GOOGLE_FAVICON_URL, getApexDomain, log } from "@dub/utils";

// PUT /api/projects/[slug]/links/[linkId] – update a link
export const PUT = withAuth(
  async ({ req, headers, project, link, session }) => {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response("Missing body.", { status: 400, headers });
    }
    if (Object.keys(body).length === 0) {
      return new Response("No fields to update.", { status: 304, headers });
    }

    const updatedLink = {
      ...link,
      ...body,
    };

    let { key, url, rewrite } = updatedLink;

    // for default dub.sh links (not part of a project)
    if (!project) {
      if (key.includes("/")) {
        return new Response("Key cannot contain '/'.", {
          status: 422,
          headers,
        });
      }
      const keyBlacklisted = await isBlacklistedKey(key);
      if (keyBlacklisted) {
        return new Response("Invalid key.", { status: 422, headers });
      }
      const domainBlacklisted = await isBlacklistedDomain(url);
      if (domainBlacklisted) {
        return new Response("Invalid url.", { status: 422, headers });
      }
      if (rewrite) {
        return new Response(
          "You can only use link cloaking on a custom domain.",
          { status: 403, headers },
        );
      }
    }

    key = processKey(key);
    if (!key) {
      return new Response("Invalid key.", { status: 422, headers });
    }

    const [response, invalidFavicon] = await Promise.allSettled([
      editLink({
        // link is guaranteed to exist because if not we will return 404
        domain: link!.domain,
        key: link!.key,
        updatedLink,
      }),
      ...(!project && url
        ? [
            fetch(`${GOOGLE_FAVICON_URL}${getApexDomain(url)}`).then(
              (res) => !res.ok,
            ),
          ]
        : []),
      // @ts-ignore
    ]).then((results) => results.map((result) => result.value));

    if (response === null) {
      return new Response("Key already exists.", { status: 409, headers });
    }

    if (!project && invalidFavicon) {
      await log({
        message: `*${
          session.user.email
        }* edited a link (dub.sh/${key}) to the ${url} ${
          invalidFavicon ? " but it has an invalid favicon :thinking_face:" : ""
        }`,
        type: "links",
        mention: true,
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

// DELETE /api/projects/[slug]/links/[linkId] – delete a link
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
