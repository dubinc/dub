import { addLink, getLinksForProject, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { ratelimit } from "@/lib/upstash";
import {
  APP_DOMAIN_WITH_NGROK,
  DUB_PROJECT_ID,
  GOOGLE_FAVICON_URL,
  LOCALHOST_IP,
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

    const { link, error, status } = await processLink({
      payload: body,
      project,
      session,
    });

    if (error) {
      return new Response(error, { status, headers });
    }

    if (!session) {
      const ip = req.headers.get("x-forwarded-for") || LOCALHOST_IP;
      const { success } = await ratelimit(10, "1 d").limit(ip);

      if (!success) {
        return new Response(
          "Rate limited – you can only create up to 10 links per day without an account.",
          { status: 429 },
        );
      }
    }

    const response = await addLink(link);

    if (response === null) {
      return new Response("Duplicate key: This short link already exists.", {
        status: 409,
        headers,
      });
    }

    if (link.domain === "dub.sh") {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/verify`,
        body: {
          linkId: response.id,
        },
      });
    }

    return NextResponse.json(response, { headers });
  },
  {
    needNotExceededUsage: true,
    allowAnonymous: true,
  },
);
