import {
  addLink,
  getLinksForProject,
  getRandomKey,
  processKey,
} from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { isBlacklistedDomain, isBlacklistedKey } from "@/lib/edge-config";
import {
  DUB_PROJECT_ID,
  GOOGLE_FAVICON_URL,
  getApexDomain,
  log,
} from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links – get all user links
export const GET = withAuth(
  async ({ headers, searchParams, project, session }) => {
    const { domain, tagId, search, sort, page, userId, showArchived } =
      searchParams as {
        domain?: string;
        tagId?: string;
        search?: string;
        sort?: "createdAt" | "clicks" | "lastClicked";
        page?: string;
        userId?: string;
        showArchived?: string;
      };
    const response = await getLinksForProject({
      projectId: project?.id || DUB_PROJECT_ID,
      domain,
      tagId,
      search,
      sort,
      page,
      userId: project?.id ? userId : session.user.id,
      showArchived: showArchived === "true" ? true : false,
    });
    return NextResponse.json(response, {
      headers,
    });
  },
);

// POST /api/links – create a new link
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response("Missing or invalid body.", { status: 400, headers });
    }

    let { domain, key, url, rewrite, geo } = body;

    if (!url) {
      return new Response("Missing destination url.", { status: 400, headers });
    }
    if (!domain) {
      return new Response("Missing short link domain.", {
        status: 400,
        headers,
      });
    }

    if (!key) {
      key = await getRandomKey(domain);
    }

    // if it's not a custom project, do some filtering
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

    // free plan restrictions
    if (!project || project.plan === "free") {
      if (geo) {
        return new Response("You can only use geo targeting on a Pro plan.", {
          status: 403,
          headers,
        });
      }
    }

    key = processKey(key);
    if (!key) {
      return new Response("Invalid key.", { status: 422, headers });
    }

    if (!project.domains?.find((d) => d.slug === domain)) {
      return new Response("Domain does not belong to project.", {
        status: 403,
        headers,
      });
    }

    const [response, invalidFavicon] = await Promise.allSettled([
      addLink({
        ...body,
        key,
        projectId: project?.id || DUB_PROJECT_ID,
        userId: session.user.id,
      }),
      ...(!project
        ? [
            fetch(`${GOOGLE_FAVICON_URL}${getApexDomain(url)}`).then(
              (res) => !res.ok,
            ),
          ]
        : []),
      // @ts-ignore
    ]).then((results) => results.map((result) => result.value));

    if (response === null) {
      return new Response("Duplicate key: this short link already exists.", {
        status: 409,
        headers,
      });
    }

    if (!project && invalidFavicon) {
      await log({
        message: `*${
          session.user.email
        }* created a new link (dub.sh/${key}) for ${url} ${
          invalidFavicon ? " but it has an invalid favicon :thinking_face:" : ""
        }`,
        type: "links",
        mention: true,
      });
    }

    return NextResponse.json(response, { headers });
  },
  {
    needNotExceededUsage: true,
  },
);
