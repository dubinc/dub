import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { clickCache } from "@/lib/api/links/click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkViaEdge, getWorkspaceViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { isValidUrl, LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/track/visit – Track a visit event from the client-side
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { domain, url, referrer } = await parseRequestBody(req);

    if (!domain || !url) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing domain or url",
      });
    }

    const urlObj = new URL(url);

    let key = urlObj.pathname.slice(1);
    if (key === "") {
      key = "_root";
    }

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    let [cachedClickId, cachedLink] = await redis.mget<
      [string, RedisLinkProps]
    >([
      clickCache._createKey({ domain, key, ip }),
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
          message: `Link not found for domain: ${domain} and key: ${key}.`,
        });
      }

      cachedLink = formatRedisLink(link as any);

      waitUntil(linkCache.set(link as any));
    }

    const finalUrl = isValidUrl(url) ? url : cachedLink.url;

    waitUntil(
      (async () => {
        const workspace = await getWorkspaceViaEdge(cachedLink.projectId!);
        const allowedHostnames = workspace?.allowedHostnames as string[];

        if (
          verifyAnalyticsAllowedHostnames({
            allowedHostnames,
            req,
          })
        ) {
          await recordClick({
            req,
            clickId,
            linkId: cachedLink.id,
            domain,
            key,
            url: finalUrl,
            workspaceId: cachedLink.projectId,
            skipRatelimit: true,
            ...(referrer && { referrer }),
            trackConversion: cachedLink.trackConversion,
          });
        }
      })(),
    );

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
});

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
