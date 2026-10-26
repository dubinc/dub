import { allowedHostnamesCache } from "@/lib/analytics/allowed-hostnames-cache";
import {
  getHostnameFromRequest,
  verifyAnalyticsAllowedHostnames,
} from "@/lib/analytics/verify-analytics-allowed-hostnames";
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
import { formatRedisLink, redis, redisGlobalWithTimeout } from "@/lib/upstash";
import { getDomainWithoutWWW, isValidUrl, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const trackClickSchema = z.object({
  domain: z.preprocess(
    (val) => getDomainWithoutWWW(val as string),
    z.string({ error: "domain is required." }),
  ),
  key: z.string({ error: "key is required." }),
  url: z.string().nullish(),
  referrer: z.string().nullish(),
});

const trackClickResponseSchema = z.object({
  clickId: z.string(),
});

// POST /api/track/click – Track a click event for a link
export const POST = withAxiom(async (req) => {
  try {
    const { domain, key, url, referrer } = trackClickSchema.parse(
      await parseRequestBody(req),
    );

    const identityHash = await getIdentityHash(req);

    let [redisGlobalResults, cachedAllowedHostnames] = await Promise.all([
      redisGlobalWithTimeout
        .mget<
          [string | null, RedisLinkProps | null]
        >([recordClickCache._createKey({ domain, key, identityHash }), linkCache._createKey({ domain, key })])
        .catch(() => [null, null] as [string | null, RedisLinkProps | null]),

      redis.get<string[]>(allowedHostnamesCache._createKey({ domain })),
    ]);

    let [cachedClickId, cachedLink] = redisGlobalResults;

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

    if (!cachedLink.projectId) {
      throw new DubApiError({
        code: "not_found",
        message: "Link does not belong to a workspace.",
      });
    }

    const finalUrl = url
      ? isValidUrl(url)
        ? url
        : cachedLink.url
      : cachedLink.url;

    // if there's no cached clickId, track the click event
    if (!cachedClickId) {
      if (!cachedAllowedHostnames) {
        const workspace = await getWorkspaceViaEdge({
          workspaceId: cachedLink.projectId,
          includeDomains: true,
        });

        cachedAllowedHostnames = (workspace?.allowedHostnames ??
          []) as string[];

        waitUntil(
          allowedHostnamesCache.mset({
            allowedHostnames: JSON.stringify(cachedAllowedHostnames),
            domains: workspace?.domains.map(({ slug }) => slug) ?? [],
          }),
        );
      }

      const allowRequest = verifyAnalyticsAllowedHostnames({
        allowedHostnames: cachedAllowedHostnames,
        req,
      });

      if (!allowRequest) {
        throw new DubApiError({
          code: "forbidden",
          message: `Request origin '${getHostnameFromRequest(req)}' is not included in the allowed hostnames for this workspace. Update your allowed hostnames here: https://app.dub.co/settings/tracking`,
        });
      }

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
        shouldCacheClickId: true,
      });
    }

    const response = trackClickResponseSchema.parse({
      clickId,
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
