import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { extractPublishableKey, parseRequestBody } from "@/lib/api/utils";
import { getLink, getProjectByPublishableKey } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/click – Track a click event from client side
export const POST = async (req: Request) => {
  try {
    const publishableKey = extractPublishableKey(req);
    const workspace = await getProjectByPublishableKey(publishableKey);

    if (!workspace) {
      throw new DubApiError({
        code: "unauthorized",
        message: `Workspace not found for publishable key: ${publishableKey}`,
      });
    }

    const { identifier } = await parseRequestBody(req);

    const link = await getLink(workspace.id, identifier);

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for identifier: ${identifier}`,
      });
    }

    const cacheKey = `recordClick:${link.id}:${ipAddress(req)}`;
    let clickId = await redis.get<string>(cacheKey);

    if (!clickId) {
      clickId = nanoid(16);

      waitUntil(
        Promise.allSettled([
          redis.set(cacheKey, clickId, {
            ex: 60 * 60,
          }), // 1 hour
          recordClick({
            req,
            clickId,
            linkId: link.id,
            url: link.url,
            skipRatelimit: true,
          }),
        ]),
      );
    }

    return NextResponse.json(
      {
        clickId,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
