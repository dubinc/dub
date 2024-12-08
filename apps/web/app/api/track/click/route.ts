import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { ratelimit, redis } from "@/lib/upstash";
import { LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/track/click – Track a click event from client side
export const POST = async (req: Request) => {
  try {
    const { domain, key } = await parseRequestBody(req);

    if (!domain || !key) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing domain or key",
      });
    }

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    const { success } = await ratelimit().limit(
      `track-click:${domain}-${key}:${ip}`,
    );
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }

    const link = await getLinkViaEdge(domain, key);

    if (!link) {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const cacheKey = `recordClick:${link.id}:${ip}`;

    let clickId = await redis.get<string>(cacheKey);

    if (!clickId) {
      clickId = nanoid(16);

      waitUntil(
        recordClick({
          req,
          clickId,
          linkId: link.id,
          url: link.url,
          skipRatelimit: true,
          workspaceId: workspace.id,
        }),
      );
    }

    return NextResponse.json(
      {
        clickId,
      },
      {
        headers: CORS_HEADERS,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
};

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
