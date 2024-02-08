import { addLink, getLinksForProject, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import { ratelimit } from "@/lib/upstash";
import { CreateLinkBodySchema, GetLinksQuery } from "@/lib/zod/schemas/links";
import { APP_DOMAIN_WITH_NGROK, LOCALHOST_IP } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links – get all user links
export const GET = withAuth(async ({ headers, searchParams, project }) => {
  try {
    const { domain, tagId, search, sort, page, userId, showArchived } =
      GetLinksQuery.parse(searchParams);

    const response = await getLinksForProject({
      projectId: project.id,
      domain,
      tagId,
      search,
      sort,
      page,
      userId,
      showArchived,
    });
    return NextResponse.json(response, {
      headers,
    });
  } catch (err) {
    return handleAndReturnErrorResponse(err, headers);
  }
});

// POST /api/links – create a new link
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    try {
      const body = CreateLinkBodySchema.parse(await req.json());

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

      const { link } = await processLink({
        payload: body,
        project,
        session,
      });

      const response = await addLink(link);

      if (response === null) {
        throw new DubApiError({
          code: "conflict",
          message: "Duplicate key: This short link already exists.",
        });
      }

      // await qstash.publishJSON({
      //   url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/event`,
      //   body: {
      //     linkId: response.id,
      //     type: "create",
      //   },
      // });

      return NextResponse.json(response, { headers });
    } catch (err) {
      return handleAndReturnErrorResponse(err, headers);
    }
  },
  {
    needNotExceededLinks: true,
    allowAnonymous: true,
  },
);
