import { addLink, getLinksForProject, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { ratelimit } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK, LOCALHOST_IP } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links – get all user links
export const GET = withAuth(async ({ headers, searchParams, project }) => {
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
    projectId: project.id,
    domain,
    tagId,
    search,
    sort,
    page,
    userId,
    showArchived: showArchived === "true" ? true : false,
  });
  return NextResponse.json(response, {
    headers,
  });
});

// POST /api/links – create a new link
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response("Missing or invalid body.", { status: 400, headers });
    }

    if (!session) {
      const ip = req.headers.get("x-forwarded-for") || LOCALHOST_IP;
      const { success } = await ratelimit(10, "1 d").limit(ip);

      if (!success) {
        return new Response(
          "Rate limited – you can only create up to 10 links per day without an account.",
          { status: 429 },
        );
      }
    }

    const { link, error, status } = await processLink({
      payload: body,
      project,
      session,
    });

    if (error) {
      return new Response(error, { status, headers });
    }

    const response = await addLink(link);

    if (response === null) {
      return new Response("Duplicate key: This short link already exists.", {
        status: 409,
        headers,
      });
    }

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/event`,
      body: {
        linkId: response.id,
        type: "create",
      },
    });

    return NextResponse.json(response, { headers });
  },
  {
    needNotExceededLinks: true,
    allowAnonymous: true,
  },
);
