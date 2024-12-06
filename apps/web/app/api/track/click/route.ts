import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { extractPublishableKey, parseRequestBody } from "@/lib/api/utils";
import { getLinkViaEdge, getProgramByPublishableKey } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
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
    const { identifier } = await parseRequestBody(req);
    const publishableKey = extractPublishableKey(req);
    const program = await getProgramByPublishableKey(publishableKey);

    if (!program?.domain) {
      throw new DubApiError({
        code: "unauthorized",
        message: `Program domain not found for publishable key: ${publishableKey}`,
      });
    }

    const link = await getLinkViaEdge(program.domain, identifier);

    if (!link) {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
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
