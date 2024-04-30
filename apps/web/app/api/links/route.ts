import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, getLinksForWorkspace, processLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import z from "@/lib/zod";
import {
  LinkSchemaExtended,
  createLinkBodySchema,
  getLinksQuerySchemaExtended,
} from "@/lib/zod/schemas";
import { UserSchema } from "@/lib/zod/schemas/users";
import { LOCALHOST_IP, getSearchParamsWithArray } from "@dub/utils";
import { NextResponse } from "next/server";

const LinkSchemaWithUser = LinkSchemaExtended.extend({
  user: UserSchema.extend({ createdAt: z.date() }),
});

// GET /api/links – get all links for a workspace
export const GET = withWorkspace(async ({ req, headers, workspace }) => {
  const searchParams = getSearchParamsWithArray(req.url);

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
    includeUser,
  } = getLinksQuerySchemaExtended.parse(searchParams);

  const response = await getLinksForWorkspace({
    workspaceId: workspace.id,
    domain,
    tagId,
    tagIds,
    search,
    sort,
    page,
    userId,
    showArchived,
    withTags,
    includeUser,
  });

  const links = (includeUser ? LinkSchemaWithUser : LinkSchemaExtended)
    .array()
    .parse(response);

  return NextResponse.json(links, {
    headers,
  });
});

// POST /api/links – create a new link
export const POST = withWorkspace(
  async ({ req, headers, session, workspace }) => {
    const bodyRaw = await parseRequestBody(req);
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
      payload: body,
      workspace,
      ...(session && { userId: session.user.id }),
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const response = await createLink(link);

    return NextResponse.json(LinkSchemaExtended.parse(response), { headers });
  },
  {
    needNotExceededLinks: true,
    allowAnonymous: true,
  },
);
