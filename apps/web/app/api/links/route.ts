import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { addLink, getLinksForProject, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth/utils";
import { qstash } from "@/lib/cron";
import { LinkWithTagIdsProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import {
  createLinkBodySchema,
  getLinksQuerySchema,
} from "@/lib/zod/schemas/links";
import { APP_DOMAIN_WITH_NGROK, LOCALHOST_IP } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links – get all links for a project
export const GET = withAuth(async ({ headers, searchParams, project }) => {
  const {
    domain,
    tagId,
    tagIds,
    search,
    sort,
    page,
    userId,
    showArchived,
    withTags,
  } = getLinksQuerySchema.parse(searchParams);

  const response = await getLinksForProject({
    projectId: project.id,
    domain,
    tagId,
    tagIds,
    search,
    sort,
    page,
    userId,
    showArchived,
    withTags,
  });
  return NextResponse.json(response, {
    headers,
  });
});

// POST /api/links – create a new link
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    let bodyRaw;
    try {
      bodyRaw = await req.json();
    } catch (error) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid body – body must be a valid JSON.",
      });
    }
    const body = createLinkBodySchema.parse(bodyRaw);

    if (!session) {
      const ip = req.headers.get("x-forwarded-for") || LOCALHOST_IP;
      const { success } = await ratelimit(10, "1 d").limit(ip);

      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message:
            "Rate limited – you can only create up to 10 links per day without an account.",
        });
      }
    }

    const { link, error, code } = await processLink({
      payload: body as LinkWithTagIdsProps,
      project,
      ...(session && { userId: session.user.id }),
    });

    if (error) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const response = await addLink(link);

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
