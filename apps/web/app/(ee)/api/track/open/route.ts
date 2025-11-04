import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { recordClickCache } from "@/lib/api/links/record-click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getIdentityHash } from "@/lib/middleware/utils";
import { DeepLinkClickData } from "@/lib/middleware/utils/cache-deeplink-click-data";
import { getLinkViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  trackOpenRequestSchema,
  trackOpenResponseSchema,
} from "@/lib/zod/schemas/opens";
import { LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

// POST /api/track/open – Track an open event for deep link
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { deepLink: deepLinkUrl, dubDomain } = trackOpenRequestSchema.parse(
      await parseRequestBody(req),
    );

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
    const identityHash = await getIdentityHash(req);

    if (!deepLinkUrl) {
      if (ip) {
        // if ip address is present, check if there's a cached click
        console.log(`Checking cache for ${ip}:${dubDomain}:*`);

        // Get all iOS click cache keys for this identity hash
        const [_, cacheKeysForDomain] = await redis.scan(0, {
          match: `deepLinkClickCache:${ip}:${dubDomain}:*`,
          count: 10,
        });

        if (cacheKeysForDomain.length > 0) {
          const cachedData = await redis.get<DeepLinkClickData>(
            cacheKeysForDomain[0],
          );

          if (cachedData) {
            return NextResponse.json(
              trackOpenResponseSchema.parse(cachedData),
              {
                headers: COMMON_CORS_HEADERS,
              },
            );
          }
        }
      }

      return NextResponse.json(
        trackOpenResponseSchema.parse({
          clickId: null,
          link: null,
        }),
        { headers: COMMON_CORS_HEADERS },
      );
    }

    const deepLink = new URL(deepLinkUrl);

    const domain = deepLink.hostname.replace(/^www\./, "").toLowerCase();
    const key = deepLink.pathname.slice(1) || "_root"; // Remove leading slash, default to _root if empty

    let [cachedClickId, cachedLink] = await redis.mget<
      [string, RedisLinkProps, string[]]
    >([
      recordClickCache._createKey({ domain, key, identityHash }),
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
          message: `Deep link not found: ${deepLink}`,
        });
      }

      cachedLink = formatRedisLink(link as any);

      waitUntil(linkCache.set(link as any));
    }

    if (!cachedLink.projectId) {
      throw new DubApiError({
        code: "not_found",
        message: "Deep link does not belong to a workspace.",
      });
    }

    // if there's no cached clickId, track the click event
    if (!cachedClickId) {
      await recordClick({
        req,
        clickId,
        workspaceId: cachedLink.projectId,
        linkId: cachedLink.id,
        domain,
        key,
        url: cachedLink.url,
        programId: cachedLink.programId,
        partnerId: cachedLink.partnerId,
        skipRatelimit: true,
        shouldCacheClickId: true,
        trigger: "deeplink",
      });
    }

    const response = trackOpenResponseSchema.parse({
      clickId,
      link: {
        id: cachedLink.id,
        domain,
        key,
        url: cachedLink.url,
      },
    });

    return NextResponse.json(response, { headers: COMMON_CORS_HEADERS });
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
