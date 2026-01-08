import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { recordClickCache } from "@/lib/api/links/record-click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { withAxiom } from "@/lib/axiom/server";
import { getIdentityHash } from "@/lib/middleware/utils/get-identity-hash";
import { getLinkViaEdge, getWorkspaceViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { isValidUrl, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/visit – Track a visit event from the client-side
export const POST = withAxiom(async (req) => {
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

    const identityHash = await getIdentityHash(req);

    let [clickId, cachedLink] = await redis.mget<[string, RedisLinkProps]>([
      recordClickCache._createKey({ domain, key, identityHash }),
      linkCache._createKey({ domain, key }),
    ]);

    // if the clickId is already cached in Redis, return it
    if (clickId) {
      return NextResponse.json({ clickId }, { headers: COMMON_CORS_HEADERS });
    }

    // Otherwise, track the visit event
    clickId = nanoid(16);

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
        const workspace = await getWorkspaceViaEdge({
          workspaceId: cachedLink.projectId!,
        });

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
            workspaceId: cachedLink.projectId,
            linkId: cachedLink.id,
            domain,
            key,
            url: finalUrl,
            skipRatelimit: true,
            ...(referrer && { referrer }),
            trigger: "pageview",
            shouldCacheClickId: true,
          });
        }
      })(),
    );

    return NextResponse.json(
      {
        clickId,
      },
      {
        headers: COMMON_CORS_HEADERS,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, COMMON_CORS_HEADERS);
  }
});

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: COMMON_CORS_HEADERS,
  });
};
