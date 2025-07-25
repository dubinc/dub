import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { recordClickCache } from "@/lib/api/links/record-click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const trackOpenSchema = z.object({
  domain: z.string().trim(),
  key: z.string().trim(),
});

const trackOpenResponseSchema = z.object({
  clickId: z.string(),
  url: z.string(),
});

// POST /api/track/open – Track an open event for deep link
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { domain, key } = trackOpenSchema.parse(await parseRequestBody(req));

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    let [cachedClickId, cachedLink] = await redis.mget<
      [string, RedisLinkProps, string[]]
    >([
      recordClickCache._createKey({ domain, key, ip }),
      linkCache._createKey({ domain, key }),
    ]);

    // assign a new clickId if there's no cached clickId
    // else, reuse the cached clickId
    const clickId = cachedClickId ?? nanoid(16);

    if (!cachedLink) {
      const link = await getLinkViaEdge({
        domain,
        key,
      });

      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: `Link not found for the short link https://${domain}/${key}`,
        });
      }

      cachedLink = formatRedisLink(link as any);

      waitUntil(linkCache.set(link as any));
    }

    if (!cachedLink.projectId) {
      throw new DubApiError({
        code: "not_found",
        message: "Link does not belong to a workspace.",
      });
    }

    // if there's no cached clickId, track the click event
    if (!cachedClickId) {
      await recordClick({
        req,
        clickId,
        linkId: cachedLink.id,
        domain,
        key,
        url: cachedLink.url,
        workspaceId: cachedLink.projectId,
        skipRatelimit: true,
        shouldCacheClickId: true,
        trigger: "deeplink",
      });
    }

    const response = trackOpenResponseSchema.parse({
      clickId,
      url: cachedLink.url,
    });

    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
});

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
